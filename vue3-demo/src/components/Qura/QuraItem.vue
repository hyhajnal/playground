<template>
    <div class="QuraItem">
        <h1 class="title">问题{{total}}：{{ item.title }}</h1>
        <p class="answer">{{ item.answer }}</p>
    </div>
</template>

<script lang="ts">
import { defineComponent, reactive, PropType, inject } from 'vue';

export default defineComponent({
    name: 'QuraItem',
    props: {
        item: Object as PropType<QuraItem>,
    },
    setup() {
        const total = inject('total');
        return {
            total,
        };
    },
});
</script>

<style lang="less">
    .title {
        font-weight: bold;
        margin-bottom: 6px;
        padding: 0 6px;
    }
    .answer {
        background-color: #f2f2f2;
        padding: 10px;
        border-radius: 6px;
    }
</style>
