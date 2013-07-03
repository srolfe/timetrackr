// Initialize some variables
var timeInt=window.setInterval(updateModalTime,500);
var finishEditing;
var editTime=false;
var didEdit=false;
var loggingIn=false;
var savingTime=false;
var userDat;
var sheetData;

// IE support for ISO format
(function(){
    var D= new Date('2011-06-02T09:34:29+02:00');
    if(!D || +D!== 1307000069000){
        Date.fromISO= function(s){
            var day, tz,
            rx=/^(\d{4}\-\d\d\-\d\d([tT ][\d:\.]*)?)([zZ]|([+\-])(\d\d):(\d\d))?$/,
            p= rx.exec(s) || [];
            if(p[1]){
                day= p[1].split(/\D/);
                for(var i= 0, L= day.length; i<L; i++){
                    day[i]= parseInt(day[i], 10) || 0;
                };
                day[1]-= 1;
                day= new Date(Date.UTC.apply(Date, day));
                if(!day.getDate()) return NaN;
                if(p[5]){
                    tz= (parseInt(p[5], 10)*60);
                    if(p[6]) tz+= parseInt(p[6], 10);
                    if(p[4]== '+') tz*= -1;
                    if(tz) day.setUTCMinutes(day.getUTCMinutes()+ tz);
                }
                return day;
            }
            return NaN;
        }
    }
    else{
        Date.fromISO= function(s){
            return new Date(s);
        }
    }
})()

var socket=io.connect(window.location.host);
socket.on('connect',function(){
	socket.emit('user:check');
});
socket.on('loginOk',function(data){
	console.log(data);
	setTimeout(finishLoggingIn,100);
	userDat=data;
	$('#nav-uname').html(data.uname);
	$('#uname').html(', '+data.name);
	requestSheetData();
});
socket.on('loginBad',function(data){
	badLogin(data.error);
})
socket.on('sheetData',function(data){
	reloadTable(data);
})
socket.on('sessionActive',function(data){
	userDat=data;
	$('#nav-uname').html(data.uname);
	$('#uname').html(', '+data.name);
	requestSheetData();
});
socket.on('sessionInactive',function(){
	showLoginModal();
})
socket.on('recordOK',function(){
	$('#tableLoader').fadeIn(function(){
		socket.emit('sheet:request');
	});
})

// Run on jQuery ready
$(document).ready(function(){
	console.log("OK");
	// Set the refresh modal's line-height (for vertical centering)
	window.setInterval(function(){
		$('#refreshModal').css('line-height',$('#refreshModal').css('height'));
		$('#tableLoader').css('height',$('#timeSheet').height()+2+"px");
		$('#tableLoader').css('line-height',$('#timeSheet').height()+2+"px");
	},50);
	
	// Setup the datepicker
    $('#datePick').datetimepicker({language: 'en', pick12HourFormat: true, pickTime: false}).on('changeDate',function(ev){
		$('.bootstrap-datetimepicker-widget').animate({opacity:0},{done:function(){
			$('#datePick').datetimepicker('hide');
			$('.bootstrap-datetimepicker-widget').css('opacity',1);
			$('#refreshModal').modal({backdrop:true});
		}});
    	console.log(ev.date.valueOf());
    });
	
	//showLoginModal(); // Show our login modal
	setupBinds(); // Binds
});

function requestSheetData(){
	$('#tableLoader').fadeIn();
	socket.emit('sheet:request');
}

function reloadTable(data){
	// Some variables
	var timeC=0;
	var timeB=0;
	var html="";
	var flip=false;
	var editB=false;
	
	// Flip between col1 and col2, filling in data
	for (var i in data){
		// Break timestamp into time parts
		var t=Date.fromISO(data[i].timeR);
		var h=((t.getHours()).toString().length==1?"0":"")+(t.getHours()).toString();
		var m=((t.getMinutes()).toString().length==1?"0":"")+(t.getMinutes()).toString();
		var a="am";
		if (h>12){h-=12;a="pm"}
		
		// Col1
		if (!flip){
			html+="<tr>";
			html+="<td><i class='icon icon-briefcase'></i></td>"
		};
		
		// Every col
		html+="<td>"+h+":"+m+" <sup>"+a+"</sup></td>";
		
		// Col2
		if (flip){
			var t=(Date.fromISO(data[i].timeR).getTime()-Date.fromISO(data[i-1].timeR).getTime());
			timeC+=t;
			
			// Col3
			var ms=t/1000;
			var mm=ms/60;
			var hh=mm/60;
			
			mm=Math.round(mm);
			hh=Math.floor(hh);
			
			if (mm>60) mm-=(hh*60);
			
			mm=mm.toString().length==1?"0"+mm.toString():mm;
			hh=hh.toString().length==1?"0"+hh.toString():hh;
			
			comp=hh+":"+mm;
			
			html+="<td>"+comp+"</td>"
			html+="</tr>";
			
			// Break row?
			if (data[parseInt(i)+1]!=undefined){
				html+="<tr class='warning'><td><i class='icon icon-book'></i></td>";
				
				// Col 1
				var t=Date.fromISO(data[i].timeR);
				var h=((t.getHours()).toString().length==1?"0":"")+(t.getHours()).toString();
				var m=((t.getMinutes()).toString().length==1?"0":"")+(t.getMinutes()).toString();
				var a="am";
				if (h>12){h-=12;a="pm"}
				html+="<td>"+h+":"+m+" <sup>"+a+"</sup></td>";
				
				// Col 2
				var t2=Date.fromISO(data[parseInt(i)+1].timeR);
				var h2=((t2.getHours()).toString().length==1?"0":"")+(t2.getHours()).toString();
				var m2=((t2.getMinutes()).toString().length==1?"0":"")+(t2.getMinutes()).toString();
				var a2="am";
				if (h2>12){h2-=12;a2="pm"}
				html+="<td>"+h2+":"+m2+" <sup>"+a2+"</sup></td>";
				
				// Col 3
				var tf=t2.getTime()-t.getTime();
				timeB+=tf;
				var ms=tf/1000;
				var mm=ms/60;
				var hh=mm/60;
				mm=Math.round(mm);
				hh=Math.floor(hh);
				if (mm>60) mm-=(hh*60);
				mm=mm.toString().length==1?"0"+mm.toString():mm;
				hh=hh.toString().length==1?"0"+hh.toString():hh;
				
				comp=hh+":"+mm;
			
				html+="<td>"+comp+"</td>"
				html+="</tr>";
			}
		};
		
		// Next col or next row
		flip=flip?false:true;
	}
	
	// No col2?
	if (flip){
		editB=true;
		html+="<td><a href='#recordTime' role='button' class='btn btn-info btn-block' data-toggle='modal'><i class='icon-edit icon-white'></i> Record</a></td><td></td></tr>"
	}
	
	// No edit button?
	if (!editB){
		html+="<tr><td><i class='icon icon-briefcase'></i></td><td><a href='#recordTime' role='button' class='btn btn-info btn-block' data-toggle='modal'><i class='icon-edit icon-white'></i> Record</a></td><td></td><td></td></tr>"
	}
	
	// Fill table
	$('#timeSheet tbody').html(html);
	
	// Calculate total clock
	var ms=timeC/1000;
	var mm=ms/60;
	var hh=mm/60;
	mm=Math.round(mm);
	hh=Math.floor(hh);	
	if (mm>59) mm-=(hh*60);
	mm=mm.toString().length==1?"0"+mm.toString():mm;
	hh=hh.toString().length==1?"0"+hh.toString():hh;
	
	// Record total clock
	$('#clockCol').html(hh+":"+mm);
	
	// Calculate total break
	var ms=timeB/1000;
	var mm=ms/60;
	var hh=mm/60;
	mm=Math.round(mm);
	hh=Math.floor(hh);	
	if (mm>60) mm-=(hh*60);
	mm=mm.toString().length==1?"0"+mm.toString():mm;
	hh=hh.toString().length==1?"0"+hh.toString():hh;
	
	// Record total clock
	$('#breakCol').html(hh+":"+mm);
	
	// Clear the loader
	finishIconSpin('#tableLoader i',function(){
		$('#tableLoader').fadeOut();
	})
	
	// Clear the modal (if applicable)
	if (savingTime) setTimeout(finishSavingTime,1000);
}

function recordStamp(){
	if (editTime) {}
	
	var timeC=new Date();
	var timeS=new Date(timeC.toLocaleDateString()+" "+$('#mh').html()+":"+$('#mm').html()+" "+$('#ma').html());
	
	var dat={
		timeC: timeC,
		timeS: timeS
	}
	
	socket.emit('sheet:save',dat);
}

function badLogin(error){
	loggingIn=false;
	
	if (error==0){
        $('#usernameField').keyup(function(){
            $('#userCont').removeClass('error');
            $('#usernameField').off('keyup');
        });
		$('#userCont').addClass('error');
	}else{
        $('#passwordField').keyup(function(){
            $('#passCont').removeClass('error');
            $('#passwordField').off('keyup');
        });
		$('#passCont').addClass('error');
	}
	
    $('#logButIcon').removeClass('icon-animated-spinning');
    $('#logButIcon').removeClass('animate-unlimited-times');
    $('#logButIcon').animate({width:"0px",opacity:0},{done:function(){
        $('#logButIcon').removeClass('icon-refresh').addClass('icon-remove');
        $('#logButIcon').animate({width:"15px",opacity:1},{done:function(){
			$('#loginToSite').removeClass('disabled');
			setTimeout(function(){
				$('#logButIcon').animate({width:"0px",opacity:0},{done:function(){
					$('#logButIcon').removeClass('icon-remove').addClass('icon-user');
					$('#logButIcon').animate({width:"15px",opacity:1});
				}});
			},500);
        }});
    }});
}

function doLogin(){
	socket.emit('user:auth',{username:$('#usernameField').val(),password:$('#passwordField').val()});
}

// Handle user logout
function doLogout(){
    showLoginModal();
}

// If user isn't logged in, show them the proper modal
function showLoginModal(){
    $('#loginModal').modal({backdrop:'static'});
}

// Handles standard icon loading animation, reports back when done
function startIconSpin(elem,icon,callback){
	$(elem).animate({width:"0px",opacity:0},{done:function(){
        $(elem).removeClass(icon).addClass('icon-refresh');
        $(elem).animate({width:"15px",opacity:1},{done:function(){
            $(elem).addClass('icon-animated-spinning');
            $(elem).addClass('animate-unlimited-times');
			if (callback!=undefined) callback();
        }});
    }});
}

// Handles standard icon done loading animation, reports back when done
function finishIconSpin(elem,callback){
    $(elem).removeClass('icon-animated-spinning');
    $(elem).removeClass('animate-unlimited-times');
    $(elem).animate({width:"0px",opacity:0},{done:function(){
        $(elem).removeClass('icon-refresh').addClass('icon-ok');
        $(elem).animate({width:"15px",opacity:1},{done:function(){
            if (callback!=undefined) callback();
        }});
    }});
}

// When server reports back, finalize the login procedure
function finishLoggingIn(){
	finishIconSpin('#logButIcon',function(){
        setTimeout(function(){
            $('#loginModal').modal('hide');
			$('#loginToSite').removeClass('disabled');
            $('#usernameField').val('');
            $('#passwordField').val('');
			loggingIn=false;
        },500);
	});
}

// When server reports back, finalize the time saving procedure
function finishSavingTime(){
	finishIconSpin('#recButIcon',function(){
        setTimeout(function(){
            $('#recordTime').modal('hide');
			$('#rec').removeClass('disabled');
			$('#recCancel').removeClass('disabled');
			savingTime=false;
        },200);
	});
}

// Setup our binds
function setupBinds(){
	// When the user attempts to login
    $('#loginToSite').mouseup(function(){
		if (loggingIn) return;
        var didError=false;
		
		// Validate presence of username
        if ($('#usernameField').val()==""){
            $('#userCont').addClass('error');
            $('#usernameField').keyup(function(){
                $('#userCont').removeClass('error');
                $('#usernameField').off('keyup');
            });
    
            $('#usernameField').focus();
            didError=true;;
        }
		
		// Validate presence of password
        if ($('#passwordField').val()==""){
            $('#passCont').addClass('error');
            $('#passwordField').keyup(function(){
                $('#passCont').removeClass('error');
                $('#passwordField').off('keyup');
            });
    
            if (!didError) $('#passwordField').focus();
            didError=true;
        }

		// Do not continue if we errored
        if (didError) return;
		
		// Login
		loggingIn=true;
		
		$('#loginToSite').addClass('disabled');
		startIconSpin('#logButIcon','icon-user',function(){
			setTimeout(doLogin,100);
		});
    });

	// When the user attempts to record a time
    $('#rec').mouseup(function(){
		if (savingTime) return;
		
		// Save the proper edit (now vs manual time)
        if (editTime){
            if (didEdit){
                acceptEdit();
            }else{
                cancelEditing();
            }
        }
		
		// Record the time
		savingTime=true;
		
		$('#rec').addClass('disabled');
		startIconSpin('#recButIcon','icon-edit');
		
		recordStamp();
		
        //reset everything
    });

	// Begin editing time setup
    $('#modalTime').mouseup(function(){
        if (!editTime){
            editTime=true;
            window.clearInterval(timeInt);
            doEditTime();
        }
    });

	// Save time edit
    $('#okIcon').mouseup(function(){
        acceptEdit();
    });
}

// Handle time editing
function doEditTime(){
    $('#timeIcon').mouseup(function(){ cancelEditing(); });
    $('#timeIcon').toggleClass('icon-time').toggleClass('icon-remove');
    $('#modalTime').children().addClass("inactiveEdit");
    $('#modalTime').children().mouseenter(function(){ $(this).addClass("activeEdit"); });
    $('#modalTime').children().mouseout(function(){ $(this).removeClass("activeEdit"); });
    $('#modalTime').mouseout(function(){
        if (finishEditing!=undefined){window.clearInterval(finishEditing);}
        finishEditing=window.setInterval(finishEditingTimeout,3000);
        $('#modalTime').mouseenter(function(){
            $('#modalTime').off('mouseenter');
            window.clearInterval(finishEditing);
        });
    });
    $('#modalTime').mouseover(function(){ if (finishEditing!=undefined){window.clearInterval(finishEditing);} });

	// Handle U/D/L/R keys when moused over an element
    $('body').keyup(function(e){
		// Do we care about this keycode?
        if (e.which!=37 && e.which!=38 && e.which!=39 && e.which!=40) return;
		
		// Get our children
        var elem=$('#modalTime').children();
        for (var i=0;i<elem.length;i++){
            var ee=$(elem[i]);
			
			// Are we editing this child?
            if (ee.hasClass('activeEdit')){
                didEdit=true;
                $('#okIcon').animate({opacity:1,width:"15px"});
				
				// Am / pm?
                if (ee.is('#ma')){
                    ee.html(ee.html()=="am"?"pm":"am");
                }else{
					// Add / sub?
                    var num=parseInt(ee.html());
                    num=(e.which==38 || e.which==39?num+1:num-1);
					
					// Hours?
                    if (ee.is('#mh')){
                        if (num>12){num-=12}
                        if (num<1){num+=12}
                    }
					
					// Minutes?
                    if (ee.is('#mm')){
                        if (num>59){num-=60}
                        if (num<0){num+=60}
                    }
					
					// Save
                    num=num.toString().length==1?"0"+num:num;
                    ee.html(num);
                }
            }
        }
    });
}

// Stop editing procedure
function stopEdit(){
    editTime=false;
    $('#okIcon').animate({opacity:0,width:"0px"});
    $('#timeIcon').toggleClass('icon-time').toggleClass('icon-remove');
    $('#timeIcon').off('mouseup');
    $('#modalTime').children().removeClass("activeEdit");
    $('#modalTime').children().removeClass("inactiveEdit");
    $('#modalTime').children().off('mouseenter');
    $('#modalTime').children().off('mouseout');
}

// Cancel our edit
function cancelEditing(){
    stopEdit();
    didEdit=false;
    timeInt=window.setInterval(updateModalTime,500);
}

// Timeout editing procedure
function finishEditingTimeout(){
    if (!editTime) return;
    window.clearInterval(finishEditing);
    $('#modalTime').off('mouseout');
    $('#modalTime').off('mouseenter');

    if (didEdit){
        acceptEdit();
    }else{
        cancelEditing();
    }
}

// Save the edit
function acceptEdit(){
    stopEdit();
    $('#modText').animate({width:"58px"});

    $('#modalTime').css('text-decoration','underline');
    $('#timeIcon').toggleClass('icon-time').toggleClass('icon-repeat');
    $('#timeIcon').mouseup(function(){
        resetTime();
    });
}

// Un-edit the time
function resetTime(){
    $('#modText').animate({width:"0px"});

    $('#timeIcon').off('mouseup');
    $('#timeIcon').toggleClass('icon-time').toggleClass('icon-repeat');
    $('#modalTime').css('text-decoration','none');

    editTime=false;
    timeInt=window.setInterval(updateModalTime,500);
}

// Modal time update
function updateModalTime(){
    if (!didEdit){
        var d=new Date();var h=d.getHours();var m=d.getMinutes();var a="am";
        if (d.getHours()>12){h-=12;a="pm";}
        if (m.toString().length==1){m="0"+m;}
        $('#modalTime').html("<span id='mh'>"+h+"</span>:<span id='mm'>"+m+"</span> <span id='ma'>"+a+"</span>");
    }
}