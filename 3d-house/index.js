import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function init() {
    // 渲染器：把所有的内容绘制在屏幕上
    const renderer = new THREE.WebGLRenderer();
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera( // 透视相机+圈定一定的范围
        90,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );

    camera.position.set(-0.3, 0, 0);
    
    // 控制器，调整角度
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.addEventListener("change", render);
    controls.minDistance = 1;
    controls.maxDistance = 2;
    controls.enablePan = false;
    
    // mesh 材质
    const mesh = addImg("https://qhyxpicoss.kujiale.com/r/2019/07/01/L3D137S8ENDIADDWAYUI5L7GLUF3P3WS888_3000x4000.jpg?x-oss-process=image/resize,m_fill,w_1600,h_920/format,webp", scene, 1);
    scene.add(mesh);

    controls.update();
    controls.target.copy(mesh.position);

    function render() {
      renderer.render(scene, camera);
    }

    function r() {
      render();
      requestAnimationFrame(r)
    }
    scene.add(new THREE.AxisHelper(1000));  // 坐标辅助线
    r()
}

function addImg(url, scene, n = 1) {
    const texture = new THREE.TextureLoader().load(url)
    const material = new THREE.MeshBasicMaterial({ map: texture });
    const geometry = new THREE.SphereGeometry(50, 256, 256);
    const mesh = new THREE.Mesh(geometry, material);
    material.side = THREE.DoubleSide;
    scene.add(mesh);
    return mesh;
}

init();