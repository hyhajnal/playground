import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import Counter from '../views/Counter.vue';

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'Counter',
        component: Counter,
    },
    {
        path: '/qura',
        name: 'Qura',
        component: () => import(/* webpackChunkName: "about" */ '../views/Qura.vue'),
    },
];

const router = createRouter({
    history: createWebHistory(process.env.BASE_URL),
    routes,
});

export default router;
