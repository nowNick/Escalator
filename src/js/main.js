/**
 * Created by mikolaj on 18.06.15.
 */

var container, stats;
var controls;
var camera, scene, renderer;

var group;

var targetRotation = 0;
var targetRotationOnMouseDown = 0;

var mouseX = 0;
var mouseXOnMouseDown = 0;

var windowHalfX = window.innerWidth / 2;
var windowHalfY = window.innerHeight / 2;
var prismSet;
var yellowCube;
var waypoints;
var waypointId;
var clock = new THREE.Clock();


var PrismCubeFactory = {
    getPrism : function (a) {
        var A = new THREE.Vector2( a, a );
        var B = new THREE.Vector2( a, 0 );
        var C = new THREE.Vector2( 0, a );

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


    var prismSize = 10;
    prismSet = [];
    for(var i=0; i<14; i++) {
        var myPrism = new THREE.Mesh(
            PrismCubeFactory.getPrism(prismSize),
            new THREE.MeshLambertMaterial( { color: 0x00FF00 } )
        );
        myPrism.position.set(-70+(i*prismSize),41,10);
        myPrism.waypointId = 0;
        prismSet.push(myPrism);
        scene.add( myPrism );
    }


    waypoints = [];
    var leftCorner = -50;
    var stepStart = leftCorner + (Math.abs(leftCorner*0.5));
    var rightCorner = -leftCorner;
    var stepEnd = rightCorner - rightCorner*0.5;

    var depth = 10;
    var lowH = 40;
    var highH = 80;

    var bottom = 0;

    waypoints.push(new THREE.Vector3(leftCorner, lowH, depth));
    waypoints.push(new THREE.Vector3(stepStart, lowH, depth));
    waypoints.push(new THREE.Vector3(stepEnd, highH, depth));
    waypoints.push(new THREE.Vector3(rightCorner, highH, depth));
    waypoints.push(new THREE.Vector3(rightCorner, bottom, depth));
    waypoints.push(new THREE.Vector3(leftCorner, bottom, depth));





    waypoints.forEach( function(waypoint) {
        var cube = new THREE.Mesh(
            new THREE.CubeGeometry(5,5,5),
            new THREE.MeshLambertMaterial( { color: Math.random() * 0xffffff } )
        );
        cube.position.set(waypoint.x, waypoint.y, waypoint.z);
        scene.add( cube );
    });



    //

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setClearColor( 0xf0f0f0 );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    container.appendChild( renderer.domElement );

    controls = new THREE.TrackballControls( camera, renderer.domElement );
    controls.minDistance = 200;
    controls.maxDistance = 500;

    stats = new Stats();
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.top = '0px';
    container.appendChild( stats.domElement );

    //
    window.addEventListener( 'resize', onWindowResize, false );

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

    if (prismSet) {
        prismSet.forEach(function (prism) {
            var dx = new THREE.Vector3();
            dx.subVectors(waypoints[prism.waypointId], prism.position);
            if (dx.length() > closeEnough) {
                dx.normalize();
                dx.multiplyScalar(dt*30.0);
                prism.position.add(dx);
            }
            else {
                console.log("CHANGING");
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