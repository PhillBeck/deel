const getProfile = async (req, res, next) => {
    try {
        const { Profile } = req.app.get('models')
        const profile = await Profile.findOne({ where: { id: req.get('profile_id') || 0 } })
        if (!profile) return res.status(401).end()
        req.profile = profile
        next()
    } catch (e) {
        next(e)
    }
}
module.exports = { getProfile }