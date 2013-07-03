// -- Libraries -- \\
var express=require('express.io');
var engines=require('consolidate');
var ldap=require('ldapjs');

// -- Configuration -- \\
var app=express().http().io();
var conf={
	url: 'ldap://10.0.0.3:389',
	service_name: 'Service Account',
	service_password: 'atarzaServiceAccount'
}

// -- Configure Express -- \\
app.configure(function(){
	// Logging
	app.use(express.logger('dev'));
	
	// Mustache
	app.set('view engine','html');
	app.engine('html',engines.mustache);
	
	// Static
	app.use('/js', express.static(__dirname + '/js'));
	app.use('/css', express.static(__dirname + '/css'));
	
	// Sessions
	app.use(express.cookieParser());
	app.use(express.session({secret: 'helloWorld'}));
});

app.configure('development',function(){
	app.use(express.errorHandler());
});

// -- Express Routes -- \\
app.get('/', function(req,res){
	res.render('index',function(err,html){
		res.send(html);
	});
});

// -- Socket IO Events -- \\
app.io.route('login',function(req){
	authenticate(req.data.username,req.data.password,function(dat){
		if (dat.error!=undefined){
			req.io.emit('loginBad',dat);
		}else{
			var name=(dat.split(",")[0]).substr(3);
			req.session.name=name;
			req.session.uname=req.data.username;
			req.io.emit('loginOk',{name:name,uname:req.data.username});
		}
	});
});

// Authenticate user
function authenticate(username,password,callback){
	var client=ldap.createClient({
		url:conf.url
	});
	
	client.bind('CN='+conf.service_name+', CN=Users, DC=cddimensions, DC=local',conf.service_password,function(err){
		if (err){
			console.log('Error connecting Service Account to LDAP');
		}
	
		// Find the user
		client.search('DC=cddimensions, DC=local',{scope:'sub',filter:'sAMAccountName='+username},function(err,res){
			if (err){
				console.log('Error searching LDAP');
			}
		
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
						url:conf.url
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

app.listen(3000);