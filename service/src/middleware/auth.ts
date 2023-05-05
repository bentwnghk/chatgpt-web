import CacheHelper from "../utils/cache";

const auth = async (req, res, next) => {
	try {
		const Authorization = req.header('Authorization') || "";
		const hash = Authorization.replace('Bearer ', '').trim();

		if (!Authorization || !hash || !CacheHelper.has(hash))
			throw new Error('Error: 無訪問權限 | No access rights')
		next()
	}
	catch (error) {
		res.send({ status: 'Unauthorized', message: error.message ?? 'Please authenticate.', data: null })
	}
}

export { auth }
