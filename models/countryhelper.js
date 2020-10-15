/* 
* countryhelper Schema
* Author : Konstantins Kolcovs
* (c) 2017, OK Media Group LTD.
* File : countryhelper.js
*/ 


var mongoose = require('mongoose');
var db = mongoose.createConnection('mongodb://' + process.env.DBHOST + '/' + process.env.DBNAME);
var Schema = mongoose.Schema;
//Schema

var countryhelperSchema = new Schema({
  iso : {type : String, index : true},
  country : String,
  code : String

    
}, {minimize : false, timestamps : true});
mongoose.Promise = global.Promise;
//Return model
module.exports = db.model('countryhelper', countryhelperSchema);
