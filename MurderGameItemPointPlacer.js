var reset = false;
var RESET_TIME = 500;
var SEARCH_RADIUS = 10000;
var spawnCubeNumber = 0;
var itemCubeNumber = 0;
var currentItemNumber = 1;
var currentSpawnNumber = 1;
var props;
var isVisible = false;

function placeItemCube() {    
    Entities.addEntity({
        type: "Shape",
        shape: "Cube",
        name: "MurderItemCube",        
        position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -2 })),           
        visible: true, 
        //collisionless: true,        
        color: { r: 0, g: 255, b: 0 },
        dimensions: { x: 0.2 , y: 0.2 , z: 0.2},            
        lifetime: -1,            
        userData: JSON.stringify({
            grabbableKey: { grabbable: true, triggerable: false }
        })                          
    });  
}

function placeSpawnCube() {    
    Entities.addEntity({
        type: "Shape",
        shape: "Cube",
        name: "MurderSpawnCube",       
        position: Vec3.sum(MyAvatar.position, Vec3.multiplyQbyV(MyAvatar.orientation, { x: 0, y: 0, z: -2 })),           
        visible: true, 
        //collisionless: true,        
        color: { r: 0, g: 0, b: 255 },
        dimensions: { x: 0.3 , y: 0.3 , z: 0.3},            
        lifetime: -1,            
        userData: JSON.stringify({
            grabbableKey: { grabbable: true, triggerable: false }
        })                          
    });  
}


Script.setInterval(function () {
    reset = true;    
}, RESET_TIME);

function keyPressEvent(event) {   
    switch (event.text) {        
        case "i":            
            placeItemCube();
            currentItemNumber++;                      
            break;
        case "o":        
            placeSpawnCube();
            currentSpawnNumber++;                      
            break;
        case "m":            
            print("toggle visibility");
            toggleItemVisibility();                  
            break;                                         
    }
}

function toggleItemVisibility() {    
    var entities = Entities.findEntities({x: 0, y: 0, z: 0}, 10000);
    isVisible = !isVisible;
    for (var i in entities) {        
        var props = Entities.getEntityProperties(entities[i]);
        var slicedItemName = props.name.slice(0,14);                          
        if (slicedItemName === "MurderItemCube") {            
            Entities.editEntity(props.id, {visible: isVisible });                    
        }
        var slicedSpawnName = props.name.slice(0,15);                          
        if (slicedSpawnName === "MurderSpawnCube") {            
            Entities.editEntity(props.id, {visible: isVisible });                    
        }
    }
}

function onInputEvent(input, value) {    
    if (input === Controller.Standard.X && value === 1 && reset) {
        placeItemCube();
        currentItemNumber++;
        reset = false;                      
    }
    if (input === Controller.Standard.X && value === 1 && reset) {
        placeSpawnCube();
        currentSpawnNumber++;
        reset = false;                      
    }       
}

Controller.keyPressEvent.connect(keyPressEvent);
Controller.inputEvent.connect(onInputEvent);