<template>
    <div class="Counter">
        <button @click="decrease">-</button>
        <span class="num">{{ count }}</span>
        <button @click="increase">+</button>
    </div>
    <div class="ta-c mt-20">template支持两个根节点</div>
</template>

<script lang="ts">
import { defineComponent, reactive, toRefs } from 'vue';

export default defineComponent({
    name: 'Counter',
    setup(props, { emit }) {
        const state = reactive({
            count: 0,
        });
        const decrease = () => {
            state.count -= 1;
        };
        const increase = () => {
            state.count += 1;
        };
        return {
            ...toRefs(state), increase, decrease,
        };
    },
});
</script>

<style lang="less">
.Counter {
    text-align: center;

    .num {
        margin: 0 10px;
    }
}
</style>
