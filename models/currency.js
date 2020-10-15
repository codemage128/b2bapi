/* 
* currency Schema
* Author : Konstantins Kolcovs
* (c) 2016, OK Media Group LTD.
* File : currency.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var currencySchema = new Schema({
   symbol : {type : String, index : true},
   name : String
    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('currency', currencySchema);
