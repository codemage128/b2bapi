/* 
* txn Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : txn.js
*/ 


var mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema
var ticketLogSchema = new Schema({
    time : Date,
    operation : {type : String , enum : ['creation', 'statechange', 'reply']},
    author : Schema.Types.ObjectId
}, {minimize : false, timestamps : true});
var ticketSchema = new Schema({
    ticket_id : {type : Number, index : true},
    source : {type : String, enum : ['email', 'web', 'phone']},
    author : Schema.Types.ObjectId,
      agent_cc : [],
    requester_cc : [],
	agent : Schema.Types.ObjectId,
    priority : {type : String, enum : ['low', 'medium', 'high', 'urgent'], index : true},
    sla : {type : String, enum : ['be', 'bronze', 'silver', 'gold']},
    status : {type : String, enum : ['new', 'open', 'resolved', 'closed'], index : true},
    created : Date,
    updated : Date,
    msgcount : Number,
    departament : {type : String , enum : ['support', 'sales', 'billing']},
    email_from : String,
    subject : String,
  time : {type : Date, default : Date.now, required : true, index : true},
  account : {type : Schema.Types.ObjectId, required : true, index : true},
  support_account : {type : Schema.Types.ObjectId, required : true, index : true},
  log : [ticketLogSchema]
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
ticketSchema.plugin(mongoosePaginate);
//Return model
module.exports = db.model('ticket', ticketSchema);
