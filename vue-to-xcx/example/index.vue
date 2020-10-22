<template>
    <div class='Test'>
        
        <!-- h5-begin -->
        <h1>title</h1>
        <!-- h5-end -->

        <div class="item" v-for="item in list" :key="item">
            {{item}}
        </div>
    </div>
</template>

<script>

export default {
    name: 'Test',
    components: {},
    data () {
        return {
            list: [1,2,3,4,5]
        }
    },
    created () {

    },
    mounted () {

    },
    computed: {},
    watch: {},
    methods: {

    }
}
</script>

<style lang='less' scoped>
.Test {
    .item {
        color: #ffffff;
    }
}
</style>
