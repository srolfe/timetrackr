TimeTrackr
=======

Time tracking with LDAP authentication and an MSSQL database.

How to use
--------------

TimeTrackr wasn't nessesarily intended to be used outside of our infrastucture. That being said, to get it to work on your end, you'd need to edit the configuration section in time.js as well as the search and bind strings towards the bottom of that file. The MSSQL database structre is as follows:

    Database: TimeClock
      Table: users
        - ID (INT)
        - userName (VARCHAR(50))
        - created (DATETIME)
        - lastSeen (DATETIME)
      Table: sheets
        - ID (INT)
        - userID (INT)
        - timeCreated (DATETIME)
        - timeRecorded (DATETIME)

None of these fields allow nulls.

Platform
--------------

TimeTrackr has been tested with LDAP v3, MSSQL 8.x (2000) and Node 0.10.12 on Windows Server 2003. The front-end works on modern browsers in addition to IE8. Testing beyond this was not done.

The platform utilizes Express.io, which combines Express.js and Socket.io. Everything is done in real-time, with some minor delays inserted so you could actually appreciate the animations. The front-end utilizes Bootstrap and jQuery.

License
--------------

	The MIT License (MIT)

	Copyright (c) 2014 Steve Rolfe

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in
	all copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
	THE SOFTWARE.