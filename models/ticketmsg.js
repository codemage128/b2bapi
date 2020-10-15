/* 
* txn Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : txn.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var ticketmsgSchema = new Schema({
   ticket : {type : Schema.Types.ObjectId, required : true, index : true},
   source : {type : String, enum : ['email', 'web', 'phone']},
   author : Schema.Types.ObjectId,
	author_name : String,
   email_from : String,
   message : String,
   created : Date,
   reply_to : Schema.Types.ObjectId,
   author_type : {type : String, enum : ['agent', 'requester']}
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('ticketmsg', ticketmsgSchema);
