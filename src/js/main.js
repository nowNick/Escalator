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

        var height = 12;

        return new PrismGeometry( [ A, B, C ], height );
    }
};

function StairsTape(length, height, prismAproxSize, parent) {
    var prismSize = prismAproxSize - (length % prismAproxSize); // to cover exactly
    var n = (length / prismSize)*3-3;
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

        myPrism.position.set(parent.position.x +(i*prismSize)-10,41,10);
        myPrism.waypointId = 0;
        myPrism.pivot = undefined;
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
    camera.position.set( 0, 50, 50 );
    scene.add( camera );

    var light = new THREE.PointLight( 0xffffff, 0.8 );
    camera.add( light );

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.minDistance = 10;
    controls.maxDistance = 500;

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );


    waypoints = [];
    var leftCorner = -50;
    var stepStart = leftCorner + (Math.abs(leftCorner*0.5));
    var rightCorner = -leftCorner;
    var stepEnd = rightCorner - rightCorner*0.5;

    var depth = 10;
    var lowH = 40;
    var lowerH = 20;
    var highH = 60;
    var higherH = 80;


    waypoints.push(new THREE.Vector3(leftCorner, lowH, depth));
    waypoints.push(new THREE.Vector3(stepStart, lowH, depth));
    waypoints.push(new THREE.Vector3(stepEnd, higherH, depth));

    waypoints.push(new THREE.Vector3(rightCorner, higherH, depth));

    waypoints.push(new THREE.Vector3(rightCorner, highH, depth));

    waypoints.push(new THREE.Vector3(stepEnd, highH, depth));
    waypoints.push(new THREE.Vector3(stepStart, lowerH, depth));
    waypoints.push(new THREE.Vector3(leftCorner, lowerH, depth));

    var prismSize = 10;
    prismSet = StairsTape(rightCorner - leftCorner, highH - lowH, prismSize, scene);


    waypoints.forEach( function(waypoint) {
        var cube = new THREE.Mesh(
            new THREE.CubeGeometry(5,5,5),
            new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } )
        );
        cube.position.set(waypoint.x, waypoint.y, waypoint.z);
        scene.add( cube );
    });

    window.addEventListener( 'resize', onWindowResize, false );
    document.addEventListener("keydown", onDocumentKeyDown, false);


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
            var dx = new THREE.Vector3();
            dx.subVectors(waypoints[prism.waypointId], prism.position);
            var move = dx.length() >= closeEnough;

            if(move) {
                dx.normalize();
                dx.multiplyScalar(dt*30.0);
                prism.position.add(dx);
            }
            else {
                prism.waypointId = (prism.waypointId+1) % (waypoints.length);
            }
        })

    }
    render();
    stats.update();

}

function render() {

    renderer.render( scene, camera );

}