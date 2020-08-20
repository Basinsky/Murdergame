(function () {   
    var findMurderConsoleID;
    var myID;
    var myName;
    var data = "";         
    var SEARCH_RADIUS = 1000;   
    var SEARCH_POSITION = { x: 0, y: 0, z: 0};
    var RESET_TIME_MS = 1000;
    var isMurderConsoleFound = false;    
    var reset = true;
    var shoot = true;  

    this.remotelyCallable = ["removeGun"                                       
    ]; 

    this.preload = function (entityID) {
        myID = entityID;
        myName = Entities.getEntityProperties(myID,"name").name;                   
    };
    
    Script.setInterval(function () {
        reset = true;    
    }, RESET_TIME_MS);
    
    this.removeGun = function(id,param) {
        print("i'm removing it");
        MyAvatar.endReaction("point");                     
        Entities.deleteEntity(myID);                    
    };
    
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

    function onInputEvent(input, value) {
        if (!isMurderConsoleFound) {            
            findMurderConsole();
            print("found console");           
        }
        
        if (input === Controller.Standard.RT && value > 0.9 && reset === true) {
            reset = false;          
            Entities.callEntityServerMethod(                                             
                findMurderConsoleID, 
                "receiveDataFromItem",
                [MyAvatar.sessionUUID,myID,myName,"shoot"]            
            );            
            print("shootweapon");           
        }        
    } 

    

    function onMouseEvent(event) {
        if (!isMurderConsoleFound) {            
            findMurderConsole();
            print("found console");           
        }
        
        if (event.isLeftButton && reset) { 
            reset = false;                        
            Entities.callEntityServerMethod(                                             
                findMurderConsoleID, 
                "receiveDataFromItem",
                [MyAvatar.sessionUUID,myID,myName,"shoot"]            
            );            
            print("shootweapon");           
        }        
    } 

    Controller.mousePressEvent.connect(onMouseEvent);
    Controller.inputEvent.connect(onInputEvent);
    

    Script.scriptEnding.connect(function () {
        Controller.mousePressEvent.disconnect(onMouseEvent);       
        Controller.inputEvent.disconnect(onInputEvent);
         
    });
});

