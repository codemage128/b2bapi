require('dotenv').config()
var Sms = require('./modules/smpp')
Sms.send('8888', '447496024914', 'This is a test SMS')
