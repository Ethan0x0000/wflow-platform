<script setup>
import {getInstRecords} from "@/api/instance.js";
import {ElMessage} from "element-plus";
import WAvatar from "../../../common/WAvatar.vue";
import WOrgTags from "../../../common/WOrgTags.vue";
import {download, getRes, getSize, getSysAvatar, isEmpty} from "@/utils/GlobalFunc.js";
import {getCandidates} from "@/api/task.js";
import ProcessInstPreview from "@/views/wflow/pages/workspace/subs/ProcessInstPreview.vue";
import {getStatusText} from "@/utils/ProcessUtil.js";

const props = defineProps({
  instId: String, //流程实例ID
  status: String, //流程实例状态
  isAgent: Boolean, //是否是代提交
  initiator: { //实际的发起人
    type: Object,
    default: () => {
      return {}
    }
  }
})

const loading = ref(false)
const candidateLoading = ref(false)
const records = ref([])
const candidates = ref([])
const instanceViewRef = ref()
const collapse = reactive({})
const instStatus = computed(() => {
  switch (props.status) {
    case 'RUNNING':
      return {icon: 'Loading', text: '进行中', color: 'primary'}
    case 'REFUSE':
      return {icon: 'CircleCloseFilled', text: '被驳回', color: 'danger'}
    case 'REVOKED':
      return {icon: 'RefreshLeft', text: '被撤销', color: 'info'}
    case 'PASS':
      return {icon: 'SuccessFilled', text: '审批通过', color: 'success'}
  }
})

onMounted(getRecords)

function getRecords() {
  loading.value = true
  getInstRecords(props.instId).then(res => {
    loading.value = false
    records.value = res.data
    records.value.forEach(node => {
      //如果实际处理人有评论意见，那么就拿出来合并进去
      const actuals = node.actualUsers.filter(v => !isEmptyComment(v.comment) || !isEmpty(v.signature))
      node.actualUsers.forEach(v => {
        //纠正已取消的状态
        v.result = (node.endTime && !v.result) ? 'cancel' : v.result
      })
      //合并记录然后根据结束时间排序
      const recordItems = node.recordItems.concat(actuals)
      node.recordItems = recordItems.sort((a, b) => new Date(a.endTime) - new Date(b.endTime))
      node.recordItems.forEach(item => {
        if (item.comment) {
          item.comment.imageList = (item.comment.images || []).map(img => getRes(img.url))
        } else item.comment = []
      })
      if (node.actualUsers.length === 0) {
        if (node.nodeType === 'Other') {
          //把第一个节点的提出来
          const actu = node.recordItems[0]
          node.actualUsers.push({
            assignee: actu.source,
            result: actu.result,
            endTime: actu.endTime
          })
        } else if (node.modeType && node.modeType !== 'USER'){
          //系统自动驳回/通过的审批节点，设置系统头像图标
          node.actualUsers.push({
            assignee: {name: '系统自动处理', avatar: getSysAvatar()},
            result: node.modeType === 'AUTO_PASS' ? 'pass' : 'refuse',
            endTime: node.endTime
          })
        }
      }
    })
  }).catch(err => {
    loading.value = false
    ElMessage.error(err.message)
  })
}

function getTaskMode(mode) {
  if (!mode) return ''
  switch (mode.type) {
    case 'AND':
      return '会签';
    case 'OR':
      return '或签';
    case 'NEXT':
      return '顺序会签';
    case 'CUSTOM':
      return `按比例${mode.percentage}%通过`;
  }
}

function getStatus(node) {
  if (node.actualUsers.length === 1) {
    const item = node.actualUsers[0]
    //if (!item.assignee) return '等待人员认领本任务...'
    const statusText = getStatusText(item, props.isAgent, props.initiator.name)
    switch (node.nodeType) {
      case 'Start':
        if (node.endTime && item.action === 'complete') {
          return `${item.assignee.name} (已提交)`
        }
        return `${item.assignee.name} (${statusText})`
      case 'Task':
      case 'Approval':
        return `${item.assignee.name} (${statusText})`
      case 'Cc':
        return `抄送 ${item.assignee.name}`
      case 'Other':
        return `${item.assignee.name} (${statusText})`
    }
  } else {
    const userNum = node.actualUsers.length
    switch (node.nodeType) {
      case 'Task':
        return `${userNum} 人办理`
      case 'Approval':
        if (node.modeType === 'AUTO_PASS') {
          return '系统自动处理（通过流程）'
        } else if (node.modeType === 'AUTO_REFUSE'){
          return '系统自动处理（驳回流程）'
        } else {
          return userNum > 0 ? `${userNum} 人审批` : getReasonDesc(node)
        }
      case 'Cc':
        return `抄送 ${node.actualUsers.length} 人`
    }
  }
  return ''
}

function getReasonDesc(node) {
  switch (node.reason) {
    case 'SKIP_EMPTY':
      return '未匹配到人员（已跳过）'
    case 'SKIP_DISTINCT':
      return '发起人去重为空（已跳过）'
  }
}

function isEmptyComment(cmt) {
  return !cmt || (isEmpty(cmt.text) && cmt.files.length === 0 && cmt.images.length === 0)
}

function getTimeDesc(node) {
  switch (node.nodeType) {
    case 'Task':
    case 'Approval':
    case 'Cc':
      return node.actualUsers.length > 0 ? (node.endTime || '处理中...') : node.startTime
    case 'Subproc':
      return node.endTime || '进行中...'
  }
  return node.endTime
}

function showCandidate(user) {
  candidates.value.length = 0
  candidateLoading.value = true
  getCandidates(user.taskId).then(res => {
    candidateLoading.value = false
    candidates.value = res.data
  }).catch(err => {
    candidateLoading.value = false
    ElMessage.error(err.msg || err)
  })
}

function isSpecial(result){
  return result === 'forward' || result === 'beforeAdd' || result === 'afterAdd'
}

function isEmComment(comment) {
  return isEmpty(comment.text) && isEmpty(comment.images) && isEmpty(comment.files)
}
</script>

<template>
  <div class="w-inst-record" v-loading="loading">
    <div v-for="node in records" :style="{'min-height': node.actualUsers.length > 1 ? 0 : '60px'}">
      <div class="w-inst-record-main">
        <div>
          <div class="w-inst-record-avatar">
            <template v-if="node.actualUsers.length === 1 && node.actualUsers[0].assignee">
              <w-avatar :size="40" :src="node.actualUsers[0].assignee.avatar" :show-name="false"
                        :id="node.actualUsers[0].assignee.id"
                        :status="node.actualUsers[0].result" :name="node.actualUsers[0].assignee.name"
                        show-status/>
            </template>
            <div class="w-inst-record-avatar-nodes" v-else>
              <el-avatar :size="40" v-if="node.nodeType === 'Approval'" icon="Avatar"/>
              <el-avatar :size="40" v-else-if="node.nodeType === 'Task'" icon="Checked"/>
              <el-avatar :size="40" v-else-if="node.nodeType === 'Cc'" icon="Promotion"/>
              <el-avatar :size="40" v-else-if="node.nodeType === 'Subproc'" icon="Money"/>
            </div>
          </div>
          <div class="w-inst-record-desc">
            <el-text tag="div">{{ node.nodeName }}</el-text>
            <div style="font-size: 15px" v-if="node.nodeType === 'Subproc'" class="w-flex-col-ct">
              {{node.content?.initiator?.name}} 发起子流程
              [<el-text type="primary" style="cursor: pointer;" @click="instanceViewRef.open(node.content.subInstId)">
                <el-icon><Link/></el-icon>
                {{ node.content.name }}
              </el-text>]
            </div>
            <div style="font-size: 15px" v-else>
              {{ getStatus(node) }}
              <el-text v-if="node.actualUsers.length > 1 && node.taskMode">
                ({{ getTaskMode(node.taskMode) }})
              </el-text>
              <el-popover placement="top-start" title="候选人" :width="250" trigger="click">
                <div class="w-candidate" v-loading="candidateLoading">
                  <w-avatar :key="user.id" :id="user.id" :size="35" show-y
                            v-for="user in candidates" :name="user.name" :src="user.avatar"/>
                </div>
                <template #reference>
                  <el-button v-if="node.actualUsers.length === 1 && node.actualUsers[0].result === 'candidate'"
                             link size="small" icon="View" @click="showCandidate(node.actualUsers[0])">查看参与者
                  </el-button>
                </template>
              </el-popover>
            </div>
          </div>
          <img v-if="node.actualUsers.length === 1 && !isEmpty(node.actualUsers[0].signature)"
               :src="getRes(node.actualUsers[0].signature)" width="10%" style="margin-left: 10px"/>
        </div>
        <el-text class="w-inst-record-time">{{ getTimeDesc(node) }}</el-text>
      </div>
      <div class="w-inst-record-content">
        <!-- 节点内部，实际操作处理的人 -->
        <div v-if="node.actualUsers.length > 1" class="w-inst-r-c-users">
          <w-avatar :id="item.assignee?.id" :size="35" show-y v-for="item in node.actualUsers"
                    :name="item.assignee?.name"
                    :src="item.assignee?.avatar" :status="item.result" show-status/>
        </div>
        <!-- 节点内部，详细的处理记录 -->
        <template v-if="node.recordItems.length > 0">
          <el-tooltip placement="top" v-if="node.recordItems.length > 1"
                      :content="collapse[node.id] ? '展开节点记录' : '折叠节点记录'">
            <el-button class="w-inst-r-c-sh" :icon="collapse[node.id] ? 'ArrowDown' : 'ArrowUp'"
                       size="small" circle @click="collapse[node.id] = !collapse[node.id]"
                       :style="{marginTop: node.actualUsers.length > 1 ? '-50px' : '0'}"/>
          </el-tooltip>
          <el-collapse-transition>
            <div v-show="!collapse[node.id]" class="w-inst-r-c-details">
              <div v-for="item in node.recordItems">
                <div v-if="node.actualUsers.length > 1 || node.recordItems.length > 1 || isSpecial(item.result)"
                     style="display:flex; align-items: center; margin-top: 5px">
                  <w-org-tags :model-value="[item.assignee || item.source]" :disabled="true"/>
                  <template v-if="item.operator">
                    <el-text size="small" style="margin: 0 5px">-</el-text>
                    <w-org-tags :model-value="[item.operator]" :disabled="true"/>
                    <el-text size="small" style="margin: 0 5px" type="warning">干预执行</el-text>
                    <el-text size="small" style="margin-right: 5px">{{ getStatusText(item) }}</el-text>
                  </template>
                  <template v-else>
                    <el-text size="small" style="margin-right: 5px">> {{ getStatusText(item) }}</el-text>
                  </template>
                  <w-org-tags v-if="item.target" :model-value="[item.target]" :disabled="true"/>
                  <img v-if="!isEmpty(item.signature)" :src="getRes(item.signature)" width="10%"/>
                  <el-text size="small" style="flex: 1; text-align: right">{{ item.endTime.substring(5, 16) }}</el-text>
                </div>
                <div class="w-inst-r-c-d-ct" v-if="!isEmComment(item.comment)">
                  <el-text>{{ item.comment?.text }}</el-text>
                  <div>
                    <el-image lazy v-for="img in item.comment.imageList" :alt="img" :src="img + '?zip=true'"
                              :preview-src-list="item.comment.imageList || []"/>
                  </div>
                  <div v-if="!isEmpty(item.comment.files)" class="w-inst-r-c-d-ct_files">
                    <el-text tag="div" v-for="file in item.comment.files" @click="download(file)">
                      {{file.name}}
                      <el-tag size="small" type="info">{{getSize(file.size)}}</el-tag>
                    </el-text>
                  </div>
                </div>
              </div>
            </div>
          </el-collapse-transition>
        </template>
      </div>
    </div>
    <div class="w-inst-status">
      <div>
        <el-icon :style="{color: `var(--el-color-${instStatus?.color})`}">
          <component :is="instStatus.icon"/>
        </el-icon>
      </div>
      <el-text>{{ instStatus.text }}</el-text>
    </div>
    <process-inst-preview ref="instanceViewRef"/>
  </div>
</template>

<style scoped lang="less">

.w-candidate {
  display: flex;
  flex-wrap: wrap;

  :deep(.w-avatar) {
    width: 50px;
  }
}

.w-inst-status {
  display: flex;
  align-items: center;
  padding-bottom: 0 !important;

  & > div:first-child {
    width: 40px;
    display: flex;
    margin-right: 5px;
    justify-content: center;

    & > i {
      padding: 5px;
      border-radius: 50%;
      background: var(--el-fill-color-dark);
    }
  }
}

.w-inst-record {
  & > div {
    padding-bottom: 10px;

    &:before {
      content: '';
      position: absolute;
      display: block;
      left: 18px;
      width: 4px;
      height: 100%;
      background: var(--el-fill-color-darker);
    }

    .w-inst-record-main {
      position: relative;
      width: 100%;
      z-index: 1;

      /* &:hover {
         background-color: var(--el-fill-color-lighter);
       }*/

      .w-inst-record-avatar {
        position: relative;
        padding: 2px 0;
        background-color: var(--el-bg-color);

        :deep(.w-inst-record-avatar-nodes) {
          margin-right: 5px;

          .el-avatar {
            background-color: var(--el-color-primary);
          }
        }
      }

      & > div:first-child {
        display: flex;
        flex: 1;
      }
    }

    .w-inst-record-time {
      position: absolute;
      right: 0;
      top: 10px;
    }

    .w-inst-record-desc {
      margin-left: 10px;
      //这里样式受表单影响，故加上固定值
      & > div:first-child {
        line-height: 20px;
      }

      & > div:last-child {
        line-height: 22px;
      }
    }
  }

  :deep(.w-inst-record-content) {
    margin-left: 40px;

    .w-inst-r-c-users {
      display: flex;
      margin: 5px;
      flex-wrap: wrap;

      .w-avatar {
        width: 50px;
        overflow: hidden;
      }
    }

    .w-inst-r-c-sh {
      z-index: 1;
      position: absolute;
      left: 8px;
    }

    .w-inst-r-c-details {
      & > div {
        .w-org-items {
          & > div {
            padding-left: 0;
            margin: 0;
            background-color: unset;
          }
        }

        .w-inst-r-c-d-ct {
          padding: 5px;
          margin-bottom: 10px;
          margin-left: 20px;
          border-radius: 5px;
          border-top-left-radius: 0;
          background: var(--el-fill-color);

          &>div {
            .el-image {
              width: 80px;
              height: 60px;
              margin: 2px;
              border-radius: 5px;
            }
          }
          .w-inst-r-c-d-ct_files {
            margin-top: 5px;

            & > * {
              cursor: pointer;

              &:hover {
                text-decoration: underline;
              }
            }
          }
        }
      }
    }
  }
}
</style>
