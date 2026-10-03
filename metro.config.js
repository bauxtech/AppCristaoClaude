// O app não empacota a pasta web/ (página da célula em Next.js, com dependências próprias).
const { getDefaultConfig } = require('expo/metro-config')

const config = getDefaultConfig(__dirname)
const webDir = new RegExp(`${__dirname.replace(/[/\\\\]/g, '[/\\\\]')}[/\\\\]web[/\\\\].*`)
const supabaseDir = new RegExp(`${__dirname.replace(/[/\\\\]/g, '[/\\\\]')}[/\\\\]supabase[/\\\\].*`)
config.resolver.blockList = [webDir, supabaseDir]

module.exports = config
