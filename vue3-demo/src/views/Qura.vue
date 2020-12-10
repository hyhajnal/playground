<template>
    <div class="Qura">
        <div class="qura-list" ref="QuraListRef">
            <QuraItem
                class="qura-item"
                v-for="item in list"
                :item="item"
                :key="item.id"
            />
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, reactive, ref, provide, computed } from 'vue';
import QuraItem from '@/components/Qura/QuraItem.vue';
import QuraList from '@/components/Qura/qura_data';

export default defineComponent({
    name: 'Qura',
    components: {
        QuraItem,
    },
    setup(props, { emit }) {
        const list = reactive(QuraList);
        const QuraListRef = ref(null);

        onMounted(() => {
            console.log(QuraListRef.value);
        });

        const total = computed(() => list.length);
        provide('total', total);

        return {
            list,
            QuraListRef,
        };
    },
});
</script>

<style lang="less">
.Qura {
    width: 60%;
    margin: auto;

    .qura-item {
        margin-bottom: 20px;
    }
}
</style>
