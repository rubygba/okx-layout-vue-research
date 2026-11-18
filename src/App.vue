<script setup>
import { ref, shallowRef, onUnmounted } from 'vue';
import { DockviewVue, themeDark } from 'dockview-vue';
import PanelContent from './PanelContent.vue';
const KEY = 'vue-trading-workspace:v1';
const api = shallowRef();
const status = ref('所有数据均为本地模拟，不连接 OKX 账户');
const showEditor = ref(false), editing = ref(null), targetGroup = shallowRef();
const title = ref(''), kind = ref('chart');
const kinds = {chart:'图表',book:'订单簿',trades:'最新成交',markets:'市场异动',orders:'当前委托',positions:'当前仓位',trade:'交易',notes:'自定义笔记'};
let subscription, timer;
function save(){ clearTimeout(timer); timer=setTimeout(()=>{try{localStorage.setItem(KEY,JSON.stringify({version:1,layout:api.value.toJSON()}));status.value='布局已保存到本机 · 模拟数据';}catch{status.value='无法保存，请检查浏览器存储权限';}},150); }
function add(type, id, position){ return api.value.addPanel({id:id||crypto.randomUUID(),component:'content',title:kinds[type],params:{kind:type,note:''},position}); }
function defaults(){api.value.clear();add('chart','chart');add('markets','markets',{referencePanel:'chart',direction:'right'});add('trade','trade',{referencePanel:'markets',direction:'right'});add('orders','orders',{referencePanel:'chart',direction:'below'});add('positions','positions',{referencePanel:'orders',direction:'within'});add('book','book',{referencePanel:'markets',direction:'within'});api.value.getPanel('chart').api.setSize({width:850,height:540});api.value.getPanel('markets').api.setSize({width:250});api.value.getPanel('trade').api.setSize({width:300});api.value.getPanel('orders').api.setSize({height:230});save();}
function ready(e){api.value=e.api;let restored=false;try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw?.version===1&&raw.layout){api.value.fromJSON(raw.layout);restored=true;}}catch{status.value='保存的布局已损坏，已恢复默认布局';}if(!restored)defaults();subscription=api.value.onDidLayoutChange(save);}
function openAdd(group){editing.value=null;targetGroup.value=group||api.value.activeGroup;title.value='';kind.value='chart';showEditor.value=true;}
function editActive(){const p=api.value.activePanel;if(!p)return;editing.value=p;title.value=p.title;kind.value=p.params.kind;showEditor.value=true;}
function apply(){const label=title.value.trim()||kinds[kind.value];if(editing.value){editing.value.api.setTitle(label);editing.value.api.updateParameters({kind:kind.value});}else{const p=add(kind.value,null,targetGroup.value?{referenceGroup:targetGroup.value,direction:'within'}:undefined);p.api.setTitle(label);}showEditor.value=false;save();}
function exportLayout(){const blob=new Blob([JSON.stringify({version:1,layout:api.value.toJSON()},null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='workspace-layout.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
onUnmounted(()=>{subscription?.dispose();clearTimeout(timer)});
</script>
<template>
<div class="shell">
<header class="top"><div class="brand"><span class="mark">▦</span> WORKSPACE <small>VUE LAB</small></div><nav>交易 <span>市场</span> <span>策略</span></nav><div class="right"><span class="demo-badge">DEMO · 无真实交易</span><button @click="exportLayout">导出布局</button></div></header>
<section class="ticker"><strong>₿ BTC/USDT <small>永续</small></strong><div class="price">80,634.4 <em>+1.71%</em></div><div><label>标记价格</label>80,633.7</div><div><label>24小时最高</label>81,199.9</div><div><label>24小时最低</label>77,858.0</div><div><label>24小时成交额</label>26.97 亿</div><div class="toolbar"><button @click="editActive">编辑当前标签</button><button class="primary" @click="openAdd()">＋ 添加组件</button><button @click="defaults" title="恢复默认布局">↶ 重置</button></div></section>
<div class="hint"><span>布局自由组合</span> 拖动标签到另一面板中心以合并，拖到边缘以拆分；拖动分隔线调整大小。<span class="right">Vue 3 + Dockview</span></div>
<main><DockviewVue style="height:100%;width:100%" :theme="themeDark" @ready="ready"><template #panel-content="props"><PanelContent v-bind="props" /></template><template #rightHeaderActions="{ group }"><button class="group-add" aria-label="向面板添加标签" @click="openAdd(group)">＋</button></template><template #watermark><div class="empty">工作台为空 <button @click="openAdd()">添加组件</button></div></template></DockviewVue></main>
<footer><span class="dot"></span>{{status}}<span class="right">拖拽 · 合并 · 拆分 · 自定义内容</span></footer>
<div v-if="showEditor" class="overlay" @click.self="showEditor=false"><form class="dialog" @submit.prevent="apply"><h2>{{editing?'编辑标签':'添加组件'}}</h2><p>标签名称和内容独立配置，任何分组都能放置任意组件。</p><label>内容类型<select v-model="kind"><option v-for="(v,k) in kinds" :value="k">{{v}}</option></select></label><label>标签名称<input v-model="title" placeholder="留空使用组件名称" maxlength="40"></label><div class="dialog-actions"><button type="button" @click="showEditor=false">取消</button><button class="primary" type="submit">{{editing?'保存修改':'添加标签'}}</button></div></form></div>
</div>
</template>
