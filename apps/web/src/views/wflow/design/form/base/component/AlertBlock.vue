<script setup>
import FormComponentMixin from "../../FormComponentMixin.js";
import WBrightBlock from "../../../../common/WBrightBlock.vue";

const props = defineProps({
  ...FormComponentMixin.props
})

</script>

<template>
  <w-bright-block :show-icon="!config.props.hideIcon" :closable="config.props.closable"
                  :type="config.props.type" :content="config.props.content"/>
</template>

<style scoped>

</style>
