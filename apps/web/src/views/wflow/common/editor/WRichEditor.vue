<template>
  <div class="w-rich-editor">
    <Toolbar v-if="!readonly" :editor="editorRef" :defaultConfig="editorConfig" style="border-bottom: 1px solid #ccc"/>
    <Editor :defaultConfig="editorConfig" @onBlur="$emit('blur')" @onChange="$emit('change')"
            :style="`max-height: ${maxHeight}px; min-height: 100px; overflow-y: hidden`"
            v-model="_value" @onCreated="handleCreated"/>
  </div>
</template>

<script setup>
import '@wangeditor/editor/dist/css/style.css';
import {Editor, Toolbar} from "@wangeditor/editor-for-vue";
import {getRes, uploadImg} from "@/utils/GlobalFunc.js";
import {ElMessage} from "element-plus";

const props = defineProps({
  readonly: Boolean,
  placeholder: String,
  maxHeight: {
    type: Number,
    default: 800
  }
})
const _value = defineModel({type: String, required: true, default: ''})

// 编辑器实例，必须用 shallowRef，重要！
const editorRef = shallowRef();
const editorConfig = shallowReactive({
  placeholder: props.placeholder,
  readOnly: props.readonly,
  autoFocus: false,
  MENU_CONF: {
    uploadImage: {
      maxFileSize: 10 * 1024 * 1024,
      allowedFileTypes: ['image/*'],
      async customUpload(file, insertFn) {
        uploadImg(file).then(res => {
          const link = getRes(res.data.url)
          insertFn(link, res.data.name, link)
        }).catch(err => ElMessage.warning(err.msg || '上传失败'))
      }
    }
  }
})

onBeforeUnmount(() => {
  const editor = editorRef.value;
  if (editor == null) return;
  editor.destroy();
});

const handleCreated = (editor) => {
  editorRef.value = editor; // 记录 editor 实例，重要！
};

defineEmits(['change', 'blur'])
</script>

<style lang="less" scoped>
.w-rich-editor {
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;

  :deep(.w-e-bar-item) {
    height: 30px;
    padding: 2px;

    &>button {
      height: 30px;
    }
  }

  :deep(.w-e-bar-divider) {
    height: 25px;
  }
}


</style>
