import express from 'express'
import type { RequestProps } from './types'
import type { ChatMessage } from './chatgpt'
import { chatConfig, chatReplyProcess, currentModel } from './chatgpt'
import { auth } from './middleware/auth'
import { limiter } from './middleware/limiter'
import { isNotEmptyString } from './utils/is'
import { OAuth2Client } from 'google-auth-library';
import CacheHelper from "./utils/cache";
import crypto from "crypto";

const generateRandomHash = () => {
	return crypto.randomBytes(16).toString('hex');
};

const app = express()
const router = express.Router()

const oauth2Client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET, 'http://localhost:3002/auth/google/callback');

app.use(express.static('public'))
app.use(express.json())

app.all('*', (_, res, next) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Headers', 'authorization, Content-Type')
  res.header('Access-Control-Allow-Methods', '*')
  next()
})

router.post('/chat-process', [auth, limiter], async (req, res) => {
  res.setHeader('Content-type', 'application/octet-stream')

  try {
    const { prompt, options = {}, systemMessage, temperature, top_p } = req.body as RequestProps
    let firstChunk = true
    await chatReplyProcess({
      message: prompt,
      lastContext: options,
      process: (chat: ChatMessage) => {
        res.write(firstChunk ? JSON.stringify(chat) : `\n${JSON.stringify(chat)}`)
        firstChunk = false
      },
      systemMessage,
      temperature,
      top_p,
    })
  }
  catch (error) {
    res.write(JSON.stringify(error))
  }
  finally {
    res.end()
  }
})

router.post('/config', auth, async (req, res) => {
  try {
    const response = await chatConfig()
    res.send(response)
  }
  catch (error) {
    res.send(error)
  }
})

router.post('/session', auth, async (req, res) => {
	res.send({ status: 'Success', message: '', data: { auth: true} })
})

router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body as { token: string }
    if (!token)
      throw new Error('Secret key is empty')

    if (process.env.AUTH_SECRET_KEY !== token)
      throw new Error('密钥无效 | Secret key is invalid')

    res.send({ status: 'Success', message: 'Verify successfully', data: null })
  }
  catch (error) {
    res.send({ status: 'Fail', message: error.message, data: null })
  }
})

router.get('/auth/google', (req, res) => {
	const url = oauth2Client.generateAuthUrl({
		access_type: 'offline',
		scope: [
			'https://www.googleapis.com/auth/userinfo.profile',
			'https://www.googleapis.com/auth/userinfo.email',
		],
		redirect_uri:  req.protocol + '://' + req.get('host') + '/auth/google/callback',
	});
	res.redirect(url);
});

router.get('/auth/google/config', (req, res) => {
	res.send({ status: 'Success', message: 'Google Login Config', data: {
			client_id: oauth2Client._clientId,
			ux_mode: 'popup',
			login_uri: req.protocol + '://' + req.get('host'),
	} })
})

router.get('/auth/google/callback',async (req, res) => {
	try {
		const tokenPayload = await oauth2Client.verifyIdToken({
			idToken: req.query.code as string,
		});

		const payload = tokenPayload.getPayload();
		const email = payload?.email
		const [_, domain] = email.split("@");
		const allowDomainList = process.env.GOOGLE_AUTH_ALLOW_DOMAIN.split(',');
		if (allowDomainList.includes(domain)) {
			const session = generateRandomHash();
			CacheHelper.set(session, email, 86400 * 5 /** 5 day **/);

			res.send({ status: 'Success', message: 'Login successfully', data: {session} })
			return;
		}
	} catch (error) {
		throw error;
		res.send({ status: 'Fail', message: error.message, data: null })
	}

	res.send({ status: 'Fail', message: 'Login Fail', data: null })
});

app.use('', router)
app.use('/api', router)
app.set('trust proxy', 1)

app.listen(3002, () => globalThis.console.log('Server is running on port 3002'))
