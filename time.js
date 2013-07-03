/*
 *
 * +------------------------+
 * | TrackR - Time tracking |
 * +------------------------+
 *
 */

// -- Libraries -- \\
var express=require('express.io');
var engines=require('consolidate');
var ldap=require('ldapjs');
var Connection=require('tedious').Connection;
var Request=require('tedious').Request;

// -- Configuration -- \\
var app=express().http().io();
var conf={
	// Trackr
	trackr: {
		port: 80,
		session: {
			secret: 'helloWorld'
		},
	},
	
	// LDAP
	ldap: {
		host: '10.0.0.3',
		port: '389',
		get url (){
			return 'ldap://'+this.host+':'+this.port;
		},
		username: 'Service Account',
		password: 'atarzaServiceAccount'
	},
	
	// MSSQL
	mssql: {
		userName: 'timeclock',
		password: 'atarzaTimeClock',
		server: '10.0.0.3',
		options: {
			tdsVersion: '7_1',
			database: 'timeclock'
		}
	}
}

// -- Configure / Connect MSSQL -- \\
var connection=new Connection(conf.mssql);

connection.on('connect',function(err){
	if (err!=null){
		console.error(err);
	}
});

connection.on('errorMessage',function(err){
	console.error(err);
});

// -- Configure Express -- \\
app.configure(function(){
	// Sessions
	app.use(express.cookieParser());
	app.use(express.session({secret: conf.trackr.session.secret, cookie: { maxAge: null }}));
	
	// Logging
	app.use(express.logger('dev'));
	
	// Mustache
	app.set('view engine','html');
	app.engine('html',engines.mustache);
	
	// Static
	app.use('/js', express.static(__dirname + '/js'));
	app.use('/css', express.static(__dirname + '/css'));
	
	
});

// -- Configure Express [dev] -- \\
app.configure('development',function(){
	app.use(express.errorHandler());
});

app.listen(conf.trackr.port);

// -- Express Routes -- \\

// Send index.html
app.get('/', function(req,res){
	res.render('index',function(err,html){
		res.send(html);
	});
});

// -- Socket IO Events -- \\

// User-related events
app.io.route('user', {
	
	// Check if session is still active
	check: function(req) {
		if (req.session.uid!=undefined){
			req.io.emit('sessionActive',{id:req.session.uid,name:req.session.name,uname:req.session.uname});
		}else{
			req.io.emit('sessionInactive');
		}
	},
	
	// Authenticate and resolve user
	auth: function(req) {
		authenticateLDAP(req.data.username,req.data.password,function(dat){
			if (dat.error!=undefined){
				// Login error
				req.io.emit('loginBad',dat);
			}else{
				// Login success
				var name=(dat.split(",")[0]).substr(3);
				req.session.name=name;
				req.session.uname=req.data.username;
			
				resolveUser(req.session.uname,function(id){
					req.session.uid=id;
				
					req.session.save(function(err){
						if (err) console.error(err);
						req.io.emit('loginOk',{id:req.session.uid,name:req.session.name,uname:req.session.uname});
					});
				});
			}
		});
	}
});

// Sheet-related events
app.io.route('sheet', {
	
	// Load timesheet
	request: function(req) {
		var time=req.data!=undefined?req.data.time:Date.now();
		var d=new Date(time);
		var dateS=(d.getFullYear())+"-"+(d.getMonth()+1)+"-"+(d.getDate());
		var dateE=(d.getFullYear())+"-"+(d.getMonth()+1)+"-"+(d.getDate()+1);
		var records=[]
	
		var loadSheet=new Request("SELECT * FROM dbo.sheets s WHERE userId='"+req.session.uid+"' AND s.timeCreated>'"+dateS+"' AND s.timeCreated<'"+dateE+"' ORDER BY s.timeCreated ASC",function(err,rowCount){
			if (err) console.error(err);
		});
	
		loadSheet.on('row',function(columns){
			var ob={
				id: columns[0].value,
				userId: columns[1].value,
				timeC: columns[2].value,
				timeR: columns[3].value,
				get timeM (){
					return this.timeC!=this.timeR;
				}
			}
		
			records.push(ob);
		});
	
		loadSheet.on('done',function(rowCount, more, rows){
			req.io.emit('sheetData',records);
		});
	
		connection.execSqlBatch(loadSheet);
	},
	
	// Record field
	save: function(req) {
		var C=new Date(req.data.timeC);
		var S=new Date(req.data.timeS);
		var timeC=(C.getFullYear()).toString()+((C.getMonth()+1).toString().length==1?"0":"")+(C.getMonth()+1).toString()+((C.getDate()).toString().length==1?"0":"")+(C.getDate()).toString()+" "+(C.toLocaleTimeString()).toString();
		var timeS=(S.getFullYear()).toString()+((S.getMonth()+1).toString().length==1?"0":"")+(S.getMonth()+1).toString()+((S.getDate()).toString().length==1?"0":"")+(S.getDate()).toString()+" "+(S.toLocaleTimeString()).toString();
	
		var sql="INSERT INTO dbo.sheets (userId,timeCreated,timeRecorded) VALUES('"+req.session.uid+"', '"+timeC+"', '"+timeS+"')";
	
		var recordStamp=new Request(sql,function(err,rowCount){
			if (err) console.error(err);
		})
	
		recordStamp.on('done',function(rowCount, more, rows){
			req.io.emit('recordOK');
		})
	
		connection.execSqlBatch(recordStamp);
	}
});

// -- Authentication Functions (LDAP / MSSQL) -- \\

// Resolve user to MSSQL ID
function resolveUser(username,callback){
	var resolveUser=new Request("SELECT ID FROM dbo.users WHERE userName='"+username+"'",function(err,rowCount){
		if (rowCount==0 && !err){
			var addUser=new Request("INSERT INTO dbo.users (userName) VALUES('"+username+"');SELECT @@IDENTITY",function(err,rowCount){
				if (err) console.log(err);
			});
			
			addUser.on('row',function(columns){
				callback(columns[0].value);
			});
			
			connection.execSqlBatch(addUser);
		}
	});
	
	resolveUser.on('row',function(columns){
		callback(columns[0].value);
	});
	
	connection.execSqlBatch(resolveUser);
}

// Authenticate user LDAP
function authenticateLDAP(username,password,callback){
	var client=ldap.createClient({
		url: conf.ldap.url
	});
	
	client.bind('CN='+conf.ldap.username+', CN=Users, DC=cddimensions, DC=local',conf.ldap.password,function(err){
		if (err){console.log('Error connecting Service Account to LDAP');}
	
		// Find the user
		client.search('DC=cddimensions, DC=local',{scope:'sub',filter:'sAMAccountName='+username},function(err,res){
			if (err){console.log('Error searching LDAP');}
		
			var dn;
			res.on('searchEntry',function(entry){
				dn=entry.objectName;
			});
			res.on('end',function(){
				if (!dn){
					callback({error:0});
					return;
				}
				
				client.unbind(function(err){
					var verify=ldap.createClient({
						url: conf.ldap.url
					});
					
					verify.bind(dn,password,function(err){
						verify.unbind(function(er){
							callback(err?{error:1}:dn);
						});
					});
				});
			});
		});
	});
}