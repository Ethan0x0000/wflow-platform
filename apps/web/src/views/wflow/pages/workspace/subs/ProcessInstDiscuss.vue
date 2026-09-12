<script setup>
import {useWflowStore} from "@/stores/modules/wflow.js";
import WAvatar from "../../../common/WAvatar.vue";
import {searchOrgs} from "@/api/org.js";
import {ElMessage} from "element-plus";
import {addInstDiscuss, delInstDiscuss, getInstDiscuss} from "@/api/instance.js";
import WResUpload from "../../../common/WResUpload.vue";
import {download, getRes, getSize} from "@/utils/GlobalFunc.js";

const props = defineProps({
  instId: String, //流程实例ID
  disable: Boolean //是否禁用讨论
})

const {loginUser} = useWflowStore()
//@人员搜索列表
const atList = ref([])
const atLoading = ref(false)
const loading = ref(false)
//评论消息
const msgContent = reactive({
  text: '', //文字
  atUsers: [], //被@的人
  images: [], //图片
  files: [] //附件
})
//消息列表
const msgData = ref({
  records: [],
  pages: 0,
  total: 0
})

const params = reactive({
  pageSize: 10,
  pageNo: 1,
  instId: props.instId
})

function getDiscussMsg() {
  loading.value = true
  getInstDiscuss(params).then(res => {
    loading.value = false
    msgData.value = res.data
    msgData.value.records.forEach(record => {
      record.content.imageList = (record.content.images || []).map(img => getRes(img.url))
    })
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.msg)
  })
}

function sendDiscussMsg() {
  addInstDiscuss(props.instId, msgContent).then(res => {
    ElMessage.success('评论成功')
    msgContent.text = ''
    msgContent.atUser = []
    msgContent.images = []
    msgContent.files = []
    getDiscussMsg()
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function withdraw(id) {
  delInstDiscuss(id).then(res => {
    ElMessage.success('撤销成功')
    getDiscussMsg()
  }).catch(err => {
    ElMessage.error(err.msg)
  })
}

function atRemove(pattern) {
  msgContent.atUsers = msgContent.atUsers.filter(u => u.name !== pattern)
}

function atSearch(pattern) {
  atLoading.value = true
  searchOrgs(pattern).then(res => {
    atLoading.value = false
    atList.value = res.data.map(u => {
      return {
        id: u.id,
        label: u.name,
        value: u.name,
        avatar: u.avatar
      }
    })
  }).catch(err => {
    atLoading.value = false
    ElMessage.error(err.msg)
  })
}

function atSelect(obj) {
  if (!msgContent.atUsers.some(u => u.id === obj.id)) {
    msgContent.atUsers.push({id: obj.id, name: obj.value})
  }
}

onMounted(() => {
  getDiscussMsg()
})
</script>


<template>
  <div>
    <div class="w-discuss-msgs">
      <div v-show="msgData.records.length === 0" style="text-align: center">
        <el-text v-if="disable">当前流程已关闭讨论</el-text>
        <el-text v-else>暂无讨论记录，要不发一条吧😘</el-text>
      </div>
      <el-scrollbar style="height: calc(100vh - 305px - 82px)">
        <div :class="{'w-discuss-msg': true, 'w-discuss-msg-me': loginUser.id === msg.owner.id}"
             v-for="msg in msgData.records"
             :key="msg.id">
          <w-avatar :show-name="false" :id="msg.owner.id" :name="msg.owner.name" :src="msg.owner.avatar"/>
          <div style="margin-left: 5px; ">
            <div>
              <el-text>{{ msg.owner.name }}</el-text>
              <el-text style="margin-left: 10px" size="small">{{ msg.createTime }}</el-text>
            </div>
            <div class="w-discuss-msg-ct">
              <el-popconfirm title="你确认要撤回这条消息吗?" @confirm="withdraw(msg.id)">
                <template #reference>
                  <el-button link icon="RefreshLeft"/>
                  <!--                  <el-tooltip content="撤回消息" placement="left">
                                      <el-button link icon="RefreshLeft"></el-button>
                                    </el-tooltip>-->
                </template>
              </el-popconfirm>
              <el-text>{{ msg.content.text }}</el-text>
              <div class="w-discuss-msg-img">
                <el-image lazy v-for="(img, i) in msg.content.imageList" :src="img + '?zip=true'"
                          :preview-src-list="msg.content.imageList || []"/>
              </div>
              <div class="w-discuss-msg-file">
                <el-text tag="div" v-for="file in msg.content.files" @click="download(file)">
                  {{file.name}}
                  <el-tag size="small" type="info">{{getSize(file.size)}}</el-tag>
                </el-text>
              </div>
            </div>
          </div>
        </div>
      </el-scrollbar>
    </div>
    <div class="w-discuss-input" v-if="!disable">
      <el-mention v-model="msgContent.text" type="textarea" :options="atList"
                  :loading="atLoading" @search="atSearch" whole @select="atSelect"
                  placement="top" placeholder="输入消息内容，使用@可以指定人员"
                  :maxlength="250" show-word-limit @whole-remove="atRemove">
        <template #label="{ item }">
          <w-avatar :size="30" :name="item.label" :src="item.avatar"/>
        </template>
      </el-mention>
      <div class="w-discuss-input-action">
        <w-res-upload size="small" v-model:files="msgContent.files" v-model:images="msgContent.images">
          <el-button type="primary" size="small" icon="Promotion" round @click="sendDiscussMsg">发送</el-button>
        </w-res-upload>
      </div>
    </div>
  </div>

</template>

<style scoped lang="less">
@msg-radius: 10px;

.w-discuss-msg {
  margin-bottom: 10px;
  display: flex;
  align-items: start;

  .w-discuss-msg-ct {
    width: max-content;
    max-width: 500px;
    margin-top: 5px;
    padding: 8px;
    border-radius: @msg-radius;
    background-color: var(--el-fill-color-dark);
    border-top-left-radius: 0;

    & > :first-child {
      display: none;
    }

    .w-discuss-msg-img {
      margin-top: 5px;
      &>* {
        border-radius: 5px;
        cursor: pointer;
        margin: 2px;
        width: 80px;
        height: 60px;
      }
    }

    .w-discuss-msg-file {
      margin-top: 5px;
      &> *{
        cursor: pointer;
        &:hover {
          text-decoration: underline;
        }
      }
    }
  }
}

.w-discuss-msg-me {
  justify-content: right;
  flex-direction: row-reverse;

  & > :nth-child(2) {
    margin-right: 5px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    & > div:first-child {
      display: flex;
      flex-direction: row-reverse;
      align-items: center;

      & > :first-child {
        margin-left: 10px;
      }
    }
  }

  :deep(.w-discuss-msg-ct) {
    position: relative;
    border-top-left-radius: @msg-radius;
    border-top-right-radius: 0;
    background-color: var(--el-color-primary);
    //撤回按钮
    & > :first-child {
      position: absolute;
      top: 0;
      left: -20px;
      display: block;
    }

    .el-text {
      color: white !important;
    }
  }
}

.w-discuss-input {
  //height: 82px;

  .w-discuss-input-action {
    display: flex;
    justify-content: right;
    margin-top: 5px;
  }
}
</style>
