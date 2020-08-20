(function () {         
    var findMurderConsoleID;
    var myID;
    var myName;             
    var SEARCH_RADIUS = 1000;   
    var SEARCH_POSITION = { x: 0, y: 0, z: 0};
    var RESET_TIME_MS = 1000;
    var WAIT_TIME_MS = 200;
    var isMurderConsoleFound = false;   
    var reset = true; 
    var materialID;   

    this.remotelyCallable = [
    ]; 
           
    this.preload = function (entityID) {
        myID = entityID;
        myName = Entities.getEntityProperties(myID,"name").name;
        var children = Entities.getChildrenIDs(myID);        
        for (var i in children) {
            var types = Entities.getEntityProperties(children[i],"type").type;
            if (types === "Material") {
                materialID = children[i];
                Entities.editEntity(materialID,{parentMaterialName: "mat::Blue"});
            }
        }        
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
            Entities.editEntity(materialID,{priority: 1}); 
            reset = false;          
            Entities.callEntityServerMethod(             
                findMurderConsoleID, 
                "receiveDataFromItem",
                [MyAvatar.sessionUUID,myID,myName,MyAvatar.displayName]
            );            
            Script.setTimeout(function () {         
                Entities.editEntity(materialID,{priority: 0});        
            }, WAIT_TIME_MS);
        }                
    }
   
    this.startNearTrigger = click;
    this.startFarTrigger = click;
    this.clickDownOnEntity = click;    
});