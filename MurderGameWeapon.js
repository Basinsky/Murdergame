(function () {    
    var sound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/140312__project-trident__small-knife-drop.mp3");  
    var findMurderConsoleID;
    var myID;
    var myName;             
    var SEARCH_RADIUS = 1000;   
    var SEARCH_POSITION = { x: 0, y: 0, z: 0};
    var RESET_TIME_MS = 1000;
    var isMurderConsoleFound = false;
    var reset = true;
    var isEquipped = true; 
    var isSoundFinished = true;
    var injector; 

    this.remotelyCallable = [
        "dropKnife"                                 
    ]; 

    this.preload = function (entityID) {
        myID = entityID;
        myName = Entities.getEntityProperties(myID,"name").name;
        findMurderConsole();                   
    };
    
    Script.setInterval(function () {
        reset = true;    
    }, RESET_TIME_MS);   
    
    this.dropKnife = function(id,param) {
        print("i'm dropping it");                   
        Entities.editEntity(myID, {
            parentID: Uuid.NULL,
            shapeType: "simple-compound",
            dynamic: true,
            gravity: { x: 0, y: -10, z: 0},                
            damping: 0,
            lifetime: 8,
            velocity: { x: 0, y: -0.01, z: 0}            
        });       
        isEquipped = false;               
    };
    
    this.collisionWithEntity = function (mineID, otherID, collision) { 
              
        var soundPosition = collision.contactPoint;
        var injectorOptions = {
            position: soundPosition,
            volume: 0.05
        };
        if (isSoundFinished) {
            injector = Audio.playSound(sound, injectorOptions);
            isSoundFinished = false;
        }

        injector.finished.connect(function () {
            isSoundFinished = true;
        });
                             
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
        
        if (input === Controller.Standard.RightGrip && value > 0.9 && reset === true && isEquipped === true) {
            reset = false;             
            Entities.callEntityServerMethod(                                             
                findMurderConsoleID, 
                "receiveDataFromItem",
                [MyAvatar.sessionUUID,myID,myName,isEquipped]            
            );
            print("dropweapon");           
        }        
    }      

    function keyPressEvent(event) {
        if (!isMurderConsoleFound) {            
            findMurderConsole();
            print("found console");           
        }   
        switch (event.text) {        
            case "c":                
                if (reset === true && isEquipped === true) {
                    reset = false;                
                    Entities.callEntityServerMethod(                             
                        findMurderConsoleID, 
                        "receiveDataFromItem",
                        [MyAvatar.sessionUUID,myID,myName,isEquipped]
                    );
                    print("dropweapon");
                }                                         
                break;                      
        }
    }

    Controller.inputEvent.connect(onInputEvent);
    Controller.keyPressEvent.connect(keyPressEvent);

    Script.scriptEnding.connect(function () {       
        Controller.inputEvent.disconnect(onInputEvent);
        Controller.keyPressEvent.disconnect(keyPressEvent);        
    });
});