require('dotenv').config()
var co = require('co');
var TopupLog = require('./models/topuplog');
var moment = require('moment');
var Finance = require('./modules/finance')
co(function*() {
    var t = moment().subtract(5, 'minutes')
    var x = new Date(t);
   //query
    var l = yield TopupLog.find({success : {$exists : false}, createdAt : {$lte : x}}).exec();
    console.log(l.length)
    for (var i=0;i<l.length;i++) {
        var y = l[i];
        var yy = yield  TopupLog.findOne({_id : y._id}).exec();
        
        yy.success = false;
        yy.code = "RECHARGE_FAILED"
        yy.message = "Recharge Failed";
        var z = yield yy.save();
        console.log(z._id)
        var zz = yield Finance.refund(yy._id);
    }
    process.exit(0);
})
    