import * as THREE from 'three';
// Merge static parts by material so weapon detail does not add one draw per part.
export function mergeParts(group,exclude=new Set()){
 const buckets=new Map();
 for(const child of [...group.children]){
 if(!child.isMesh||exclude.has(child)||child.material.transparent)continue;
 if(!buckets.has(child.material))buckets.set(child.material,[]);buckets.get(child.material).push(child);
 }
 for(const [material,meshes]of buckets){
 if(meshes.length<2)continue;const arrays={position:[],normal:[],uv:[]};
 for(const mesh of meshes){mesh.updateMatrix();const geo=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geo.applyMatrix4(mesh.matrix);
 for(const name of Object.keys(arrays)){const attr=geo.getAttribute(name);if(attr)arrays[name].push(...attr.array);}
 geo.dispose();mesh.geometry.dispose();group.remove(mesh);
 }
 const geometry=new THREE.BufferGeometry();for(const [name,values]of Object.entries(arrays))if(values.length)geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,name==='uv'?2:3));geometry.computeBoundingSphere();group.add(new THREE.Mesh(geometry,material));
 }
}
