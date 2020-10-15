var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
var results = new Schema({
    number : String,
    product_id : String,
    time : Date,
    success : Boolean,
    code : String,
    message : String,
    topuplog : Schema.Types.ObjectId,
    reference : String,
    related_transactions : [],
    batch_id : {type : Schema.Types.ObjectId, index : true},
    batch_jobid : {type : String, index : true},
    operator_name : String,
    country : String,
    pin_based : Boolean,
    pin_option1 : String,
    pin_option2 : String,
    pin_option3 : String,
    pin_code : String,
    pin_serial : String,
    pin_ivr : String,
    pin_validity : String,
    pin_value : String

}, {minimize : false, timestamps : true});

mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('batchresult', results);


/*
2348137899911
2348137899912
2348137899913
2348137899914
2348137899915
2348137899916
2348137899917
2348137899918
2348137899919
2348137899921
2348137899922
2348137899923
2348137899924
2348137899925
2348137899926
2348137899927
2348137899928
2348137899929


8801830070541
8801830070542
8801830070543
8801830070544
8801830070545
8801830070546
8801830070547
8801830070548
8801830070549
8801830070531
8801830070532
8801830070533
8801830070534
8801830070535
8801830070536
8801830070537
8801830070538
8801830070539

*/
