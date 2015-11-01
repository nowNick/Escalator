/**
 * Created by mikolaj on 18.06.15.
 */

var container, stats;
var controls;
var camera, scene, renderer;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var prismSet;
var waypoints;
var clock = new THREE.Clock();
var run = false;
var params = {
    speed: 30
};
var step = 0.01;

var stairsConfig = {
    prismSize : 10,
    leftCorner : -50,
    stepStart : -25,
    rightCorner : 50,
    stepEnd : 25,

    lowH : 40,
    lowerH : 20,
    highH : 60,
    higherH : 80
};

var innerPath;
var outerPath;

var PathFactory = {
    generatePath: function(additionalOffset) {

        StairsPath = function (additionalOffset, config) {
            var path = new THREE.Shape();

            path.moveTo(config.leftCorner, config.lowH + additionalOffset);

            path.lineTo(config.stepStart, config.lowH + additionalOffset);
            path.lineTo(config.stepEnd, config.higherH + additionalOffset);

            path.lineTo(config.rightCorner, config.higherH + additionalOffset);
            var slideArcR = (config.higherH - config.highH) / 2;

            path.absarc(config.rightCorner, slideArcR + config.highH,
                slideArcR + additionalOffset, Math.PI / 2, -Math.PI / 2, true);
            path.moveTo(config.rightCorner, config.highH - additionalOffset);
            path.lineTo(config.stepEnd, config.highH - additionalOffset);
            path.lineTo(config.stepStart, config.lowerH - additionalOffset);
            path.lineTo(config.leftCorner, config.lowerH - additionalOffset);
            slideArcR = (config.lowH - config.lowerH) / 2;

            path.absarc(config.leftCorner, config.lowerH + slideArcR,
                slideArcR + additionalOffset, Math.PI + Math.PI / 2, Math.PI / 2, true);
            return path;
        };

        return new StairsPath(additionalOffset, stairsConfig);
    }
};


var PrismCubeFactory = {
    getPrism : function (a) {
        var A = new THREE.Vector2( 0, 0 );
        var B = new THREE.Vector2( 0, a );
        var C = new THREE.Vector2( a, a );

        PrismGeometry = function ( vertices, height ) {

            var Shape = new THREE.Shape();

            ( function f( ctx ) {

                ctx.moveTo( vertices[0].x, vertices[0].y );
                for (var i=1; i < vertices.length; i++) {
                    ctx.lineTo( vertices[i].x, vertices[i].y );
                }
                ctx.lineTo( vertices[0].x, vertices[0].y );

            } )( Shape );

            var settings = { };
            settings.amount = height;
            settings.bevelEnabled = false;
            THREE.ExtrudeGeometry.call( this, Shape, settings );

        };
        PrismGeometry.prototype = Object.create( THREE.ExtrudeGeometry.prototype );

        var height = 18;

        return new PrismGeometry( [ A, B, C ], height );
    }
};

function StairsTape(length, height, prismAproxSize, parent) {
    var prismSize = prismAproxSize - (length % prismAproxSize); // to cover exactly
    var n = (length / prismSize)*3+8;
    var prismSet = [];

    for(var i=0; i<n; i++) {
        var texture = THREE.ImageUtils.loadTexture( 'images/textures/step.jpg' );
        var textureMaterial =  new THREE.MeshLambertMaterial({map:texture});
        texture.anisotropy = renderer.getMaxAnisotropy();
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;


        var myPrism = new THREE.Mesh(
            PrismCubeFactory.getPrism(prismSize),
            new THREE.MeshFaceMaterial(
                [
                    textureMaterial, // +x
                    textureMaterial, // -x
                    textureMaterial, // +y
                    textureMaterial, // -y
                    textureMaterial, // +z
                    textureMaterial // -z
                ])
        );

        myPrism.geometry.computeBoundingBox();

        var max = myPrism.geometry.boundingBox.max;
        var min = myPrism.geometry.boundingBox.min;
        var texHeight = max.y - min.y;
        var width = max.x - min.x;

        texture.repeat.set(width / 512 , texHeight / 512);

        texture.needsUpdate = true;

        myPrism.position.set(parent.position.x +(i*prismSize),41,10);
        myPrism.waypointId = 0;

        prismSet.push(myPrism);
        parent.add( myPrism );
    }
    return prismSet;
}


init();
animate();

function init() {
    container = document.createElement( 'div' );
    document.body.appendChild( container );

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera( 50, window.innerWidth / window.innerHeight, 1, 1000 );
    camera.position.set( -200, 300, 200 );
    scene.add( camera );

    var light1 = new THREE.PointLight( 0xffffff, 0.8 );
    camera.add( light1 );

    // lights
    var light2 = new THREE.SpotLight( 0xffffff, 0.3);
    light2.position.set( 100, 1500, 200 );

    scene.add( light2 );

    var light3 = new THREE.SpotLight( 0xffffff, 0.3);
    light3.position.set( -100, 1500, -200 );

    scene.add( light3 );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );


    container.appendChild( renderer.domElement );

    controls = new THREE.OrbitControls( camera );
    controls.damping = 0.2;
    controls.addEventListener( 'change', render );

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    var prismSize = 10;


    innerPath = PathFactory.generatePath(0);
    outerPath = PathFactory.generatePath(prismSize);


     group = new THREE.Group();
    group.position.x = 0;
    group.position.y = 0;
    group.position.z = 0;

    var widthOfHandrails = 10;

    var sizeOfPrism = 10;
    var trackShape = PathFactory.generatePath(widthOfHandrails + sizeOfPrism);
    
    var extrudeSettings = { amount: 2, bevelEnabled: true, bevelSegments: 2, steps: 2, bevelSize: 1, bevelThickness: 1 };

    geometry = new THREE.ExtrudeGeometry( trackShape, extrudeSettings );


    var backHandrail = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: 0x333333 } ) );
    backHandrail.position.set( 0, 0, 8 );


    group.add( backHandrail );

    var frontHandrail = new THREE.Mesh( geometry, new THREE.MeshPhongMaterial( { color: 0x333333 } ) );
    frontHandrail.position.set( 0, 0, 28 );
    group.add( frontHandrail );
    scene.add( group );

    var innerSlide = new THREE.PointCloud( innerPath.createSpacedPointsGeometry( 200 ),
        new THREE.PointCloudMaterial( { color: 0xFF0000, size: 12 } ));
    innerSlide.position.set( 0, 0, 18 );
    group.add(innerSlide);

    var outerSlide = new THREE.PointCloud( outerPath.createSpacedPointsGeometry( 200 ),
        new THREE.PointCloudMaterial( { color: 0x0000FF, size: 12 } ));
    outerSlide.position.set( 0, 0, 18 );
    group.add(outerSlide);




    prismSet = StairsTape(stairsConfig.rightCorner - stairsConfig.leftCorner,
        stairsConfig.highH - stairsConfig.lowH, prismSize, scene);


    // floor

    geometry = new THREE.PlaneGeometry( 2000, 2000, 100, 100 );
    geometry.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );

    var texture = THREE.ImageUtils.loadTexture( 'images/textures/floor.jpg' );
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(32 , 32);
    material = new THREE.MeshLambertMaterial({map:texture});

    ground = new THREE.Mesh( geometry, material );
    ground.position.set(0,49,0);

    scene.add( ground );


    window.addEventListener( 'resize', onWindowResize, false );
    document.addEventListener("keydown", onDocumentKeyDown, false);


    var gui = new dat.GUI({
        height : 5 * 32 - 1
    });

    gui.add(backHandrail, 'visible').name('back');
    gui.add(frontHandrail, 'visible').name('front');
    gui.add(ground, 'visible').name('ground');

}

function onDocumentKeyDown(event) {
    var keyCode = event.which;
    if(keyCode == 32) { //space
        run = (run === false);
    }
}

function onWindowResize() {

    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize( window.innerWidth, window.innerHeight );

}

function animate() {
    var dt = clock.getDelta();
    requestAnimationFrame( animate );
    controls.update();
    var closeEnough = 1;

    if (prismSet && run) {
        prismSet.forEach(function (prism) {

            var innerPathVector = innerPath.getPoint(prism.waypointId);
            var outerPathVector = outerPath.getPoint(prism.waypointId);



            innerPathVector = new THREE.Vector3(innerPathVector.x, innerPathVector.y, prism.position.z);
            outerPathVector = new THREE.Vector3(outerPathVector.x, outerPathVector.y, prism.position.z);

            var innerSlide = new THREE.Vector3();
            innerSlide.subVectors(innerPathVector, prism.position);

            if(prism.position.x > 50 && prism.position.y > 70
                && prism.waypointId > 0.39) {
                prism.rotation.z = -Math.asin(((prism.position.x - 50) / 10));
            }
            else if(prism.position.x > 50 && prism.position.y <= 70
                && prism.waypointId > 0.44) {
                prism.rotation.z = (-Math.PI + Math.asin(((prism.position.x - 50) / 10)));
            }
            else if(prism.position.x <= 50 && prism.position.x > -50
                    && prism.waypointId > 0.49) {
                prism.rotation.z = -Math.PI;
            }
            else if(prism.position.x <= -50 && prism.position.y < 30) {
                prism.rotation.z = Math.PI + Math.asin(((prism.position.x + 50) / 10));
            }
            else if(prism.position.x <= -50 && prism.position.y >= 30) {
                prism.rotation.z = (2*Math.PI - Math.asin(((prism.position.x + 50) / 10)));
            }
            else {
                prism.rotation.z = 0;
            }

            var move = innerSlide.length() >= closeEnough;

            if(move) {
                innerSlide.normalize();
                prism.position.add(innerSlide);
            }
            else {
                prism.waypointId = (prism.waypointId+step);
                if(prism.waypointId >= 1) {
                    prism.waypointId = 0;
                }
            }
        })

    }
    render();
    stats.update();

}

function render() {

    renderer.render( scene, camera );

}