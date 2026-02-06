import { createRouter, createWebHashHistory, type RouteRecordRaw } from 'vue-router';

/** 测试路由配置 */
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('../views/HomeView.vue'),
  },
  {
    path: '/image-compression',
    name: 'image-compression',
    component: () => import('../tests/image-compression/ImageCompressionTest.vue'),
    meta: {
      title: '图片压缩测试',
      icon: '🖼️',
      description: '对比不同图片压缩算法的效果和性能',
    },
  },
];

/** 创建路由实例 */
export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

export default router;
