(function () {         
    var findMurderConsoleID;
    var myID;
    var myName;           
    var SEARCH_RADIUS = 1000;   
    var SEARCH_POSITION = { x: 0, y: 0, z: 0};
    var RESET_TIME_MS = 500;
    var isMurderConsoleFound = false;   
    var reset = true;   

    this.remotelyCallable = [
    ]; 
           
    this.preload = function (entityID) {
        myID = entityID;
        myName = Entities.getEntityProperties(myID,"name").name;
        findMurderConsole();                   
    };    
    
    Script.setInterval(function () {
        reset = true;    
    }, RESET_TIME_MS);

    function findMurderConsole() {
        var entities = Entities.findEntities(SEARCH_POSITION, SEARCH_RADIUS);
        for (var i in entities) {  
            var entProps = Entities.getEntityProperties(entities[i]);                  
            if (entProps.name === "MurderConsole") {
                findMurderConsoleID = entProps.id;                
                isMurderConsoleFound = true;                     
            }
        }        
    }    
            
    function click() {
        print(isMurderConsoleFound);
        if (!isMurderConsoleFound) {            
            findMurderConsole();
            print("found console");           
        }
        
        if (isMurderConsoleFound && reset === true) {
            reset = false;          
            Entities.callEntityServerMethod(             
                findMurderConsoleID, 
                "receiveDataFromItem",
                [MyAvatar.sessionUUID,myID,myName,"clickedKnife"]
            );           
        }                
    }

    this.startNearTrigger = click;
    this.startFarTrigger = click;
    this.clickDownOnEntity = click;    
});