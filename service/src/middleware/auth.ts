import NodeCache from "node-cache";

const CacheHelper = new NodeCache();

const auth = async (req, res, next) => {
	try {
		const Authorization = req.header('Authorization') || "";
		const hash = Authorization.replace('Bearer ', '').trim();

		if (CacheHelper.has(hash))
			throw new Error('Error: 无访问权限 | No access rights')
		next()
	}
	catch (error) {
		res.send({ status: 'Unauthorized', message: error.message ?? 'Please authenticate.', data: null })
	}
}

export { auth }
