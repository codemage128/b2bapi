/* 
* acl Schema
* Author : Konstantins Kolcovs
* (c) 2017, OK Media Group LTD.
* File : acl.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var entriesSchema = new Schema({
    code : {type : String, index : true},
    active : Boolean,
    time : Date
}, {minimize : false, timestamps : true})
var aclSchema = new Schema({
   active : Boolean,
   allow : [entriesSchema],
   block : [entriesSchema],
   type : {type : String, enum : ['restrictive', 'permissive']},
   time : Date

    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('acl', aclSchema);
