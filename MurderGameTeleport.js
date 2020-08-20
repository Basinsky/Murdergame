(function() {         
    // var teleportSound = SoundCache.getSound("http://192.168.2.200/MurderGame/sky/55853__sergenious__teleport.wav");
    var teleportSound = SoundCache.getSound("https://bas-skyspace.ams3.digitaloceanspaces.com/MurderGame/55853__sergenious__teleport.wav");
    var myColor;
    var myParent;
    var myID;
    var myPosition;   
    var offset;
    var yourColor;
    var SEARCH_RADIUS = 1000;
    var SEARCH_POSITION = { x: 0, y: 0, z: 0};    
    var teleportToPosition;
    var teleportToOrientation;
    var isTeleportLocationFound = false; 

    this.preload = function(entityID) {   
        myID = entityID;    
        var properties = Entities.getEntityProperties(entityID);
        myColor = properties.color;
        myParent = properties.parentID;
        myPosition = properties.position;
    };
    
    function playSound() {
        Audio.playSound(teleportSound, { volume: 0.1, localOnly: true });
    }           
        
    function findTeleportLocation() { 
        var myAviPosition = MyAvatar.position;
        offset = myAviPosition.y-myPosition.y;
        print("offset " + offset);

        var entities = Entities.findEntities(SEARCH_POSITION, SEARCH_RADIUS);
        for (var i = 0; i < entities.length; i++) {
            var props = Entities.getEntityProperties(entities[i]);                            
            if (props.name === "MurderGameTeleport") {
                if (props.id !== myID) {
                    yourColor = props.color;                    
                    if (yourColor.x === myColor.x && yourColor.y === myColor.y && yourColor.z === myColor.z) {
                        print("colors match");                       
                        var teleportToPositionLocal = Vec3.sum(Vec3.sum(props.localPosition,Vec3.multiplyQbyV(props.localRotation, { x: 0, y: 0, z: -2 })),{ x: 0, y: -offset, z: 0 });                    
                        var teleportToRotationLocal = props.localRotation;                    
                        teleportToPosition = Entities.localToWorldPosition( teleportToPositionLocal, myParent);
                        teleportToOrientation = Entities.localToWorldRotation( teleportToRotationLocal, myParent);                        
                        isTeleportLocationFound = true;                                  
                    } 
                }                                                        
            }              
        }        
    }

    this.enterEntity = function(entityID) {
        var entProps = Entities.getEntityProperties(entityID);
        myColor = entProps.color;
        myParent = entProps.parentID;
        print(JSON.stringify(myColor));
        print(JSON.stringify("myParent" + myParent));
        findTeleportLocation();
        
        if (isTeleportLocationFound) {
            Window.location = "/" + teleportToPosition.x + "," + teleportToPosition.y + "," + teleportToPosition.z + "/" + teleportToOrientation.x + "," + teleportToOrientation.y + "," + teleportToOrientation.z + "," + teleportToOrientation.w;
            
        }        
        playSound();            
    };    
});