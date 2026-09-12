<script lang="jsx">
import WAvatar from "../../../common/WAvatar.vue";
import WOrgTags from "../../../common/WOrgTags.vue";
import WOrgPicker from "../../../common/WOrgPicker.vue";
import WDialog from "../../../common/WDialog.vue";
import {getForecast, getForecastMock} from "@/api/startup.js";
import {ElMessage} from "element-plus";
import {getProcModelByVer} from "@/api/model.js";
export default {
  name: 'ProcessForecast',
  components: {WOrgPicker, WAvatar, WOrgTags, WDialog},
  props: {
    modelValue: {
      type: Object,
      default: () => {
        return {}
      }
    },
    isMock: Boolean,
    process: Object,
    formData: Object
  },
  computed:{
    _value: {
      get() {
        return this.modelValue
      },
      set(val) {
        this.$emit('update:modelValue', val)
      }
    }
  },
  emits: ['update:modelValue'],
  data() {
    return {
      nodes: [],
      selectedNode: {},
      subprocVisible: false,
      processLoading: false,
      subproc: {},
      subprocNode: {}
    }
  },
  render() {
    //用jsx比较灵活，动态根据json构建节点，主要是有嵌套的结构，这样处理比较方便
    const getNodeReasonDesc = (node) => {
      switch (node.reason) {
        case 'SKIP_EMPTY': return '未匹配到人员（将跳过）'
        case 'SKIP_DISTINCT': return '发起人去重为空（将跳过）'
        default: return '未解析到人员，请注意喔😲'
      }
    }

    const getTip = (node) => {
      if (node.enableAddNum > 0 && node.orgs.length <= 0){
        switch (node.type){
          case 'Approval':
            return <el-text size="small" type="warning">请添加审批人</el-text>
          case 'Task':
            return <el-text size="small" type="warning">请添加办理人</el-text>
          case 'Cc':
            return <el-text size="small" type="warning">您可以添加抄送人</el-text>;
          default:
            return '';
        }
      } else if (node.mode && node.mode !== 'USER') {
        if (node.mode === 'AUTO_PASS') {
          return <el-text size="small" type="success">
            <el-icon><SuccessFilled/></el-icon>
            流程到达本节点将自动通过并结束
          </el-text>
        } else if (node.mode === 'AUTO_REFUSE') {
          return <el-text size="small" type="danger">
            <el-icon><CircleCloseFilled/></el-icon>
            流程到达本节点将自动驳回并结束
          </el-text>
        } else {
          return ''
        }
      } else if (node.orgs && node.orgs.length <= 0) {
        return <el-text size="small" type="warning">{getNodeReasonDesc(node)}</el-text>
      } else {
        return ''
      }
    }
    const resolveNode = (procNodes, nodes) => {
      procNodes.forEach((node, nodeIndex) => {
        if (Array.isArray(node.options)) {
          nodes.push(
              <el-timeline-item icon={node.icon} class="w-forecast-node" size="large" key={node.nodeId || nodeIndex}>
                <el-radio-group v-model={node.activeIndex} size="small" key={node.activeIndex}>
                  {
                    node.options.map((option, index) => (
                        <el-radio-button label={option.nodeName} value={index}
                                         class={option.skip ? 'w-forecast-node-skip' : ''}
                                         key={option.nodeId || `${node.nodeId}-${index}`}/>
                    ))
                  }
                </el-radio-group>
                <el-text size="small" tag="div" domPropsInnerHTML={node.desc}>{node.desc}</el-text>
              </el-timeline-item>
          )
          resolveNode(node.branches[node.activeIndex], nodes)
        } else {
          nodes.push(
              <el-timeline-item icon={node.icon} size="large" class="w-forecast-node" key={node.nodeId || nodeIndex}>
                <el-text tag="div">{node.nodeName}</el-text>
                <el-text size="small">{this.getNodeDesc(node)} {getTip(node)}</el-text>
                <div class="w-forecast-node-users">
                  {
                    node.enableAddNum > 0 ? (
                        <div class="w-node-add">
                          <el-button onClick={() => this.addUser(node)} icon="plus" circle></el-button>
                          <el-text>添加</el-text>
                        </div>
                    ) : ''
                  }
                  {
                    (node.orgs || []).length > 0 ? (node.orgs || []).map((user, i) => (
                        <w-avatar closeable={user.enableEdit || node.enableAddNum > 0} id={user.id} size={35} showY={true}
                                  name={user.name} src={user.avatar} key={user.id} onClose={() => this.delUser(node, i)}/>
                    )) : ''
                  }
                </div>
              </el-timeline-item>
          )
        }
      })
    }
    this.nodes.length = 0
    resolveNode(this.process || [], this.nodes)
    if (this.nodes.length > 0){
      return <div>
        <el-timeline class="w-forecast">{this.nodes}</el-timeline>
        <w-org-picker ref="orgPicker" multiple={this.selectedNode?.enableAddNum > 1}
                      type="user" selected={this.selectedNode.orgs || []} onOk={v => this.selectOk(v)}/>
        <w-dialog show-ok={false} cancel-text="关闭" v-model={this.subprocVisible} title={this.subprocNode.desc} width="600">
          <div style="padding: 0 20px">
            <process-forecast v-loading={this.processLoading} v-model={this._value}
                              form-data={this.formData} process={this.subproc.process}/>
          </div>
        </w-dialog>
      </div>
    }else {
      return <el-text type="danger">😥流程预测渲染失败，请检查流程设计</el-text>
    }
  },
  methods: {
    addUser(node) {
      this.selectedNode = node
      this.$refs.orgPicker.open()
    },
    selectOk(orgs) {
      this.selectedNode.orgs = orgs.map(v => {
        v.enableEdit = true;
        return v
      })
      this._value[this.selectedNode.nodeId] = this.selectedNode.orgs.map(v => v.id)
      this.$refs.orgPicker.close()
    },
    delUser(node, i){
      node.orgs.splice(i, 1)
      this._value[node.nodeId] = node.orgs.map(v => v.id)
    },
    getNodeDesc(node) {
      const cd = node.candidate ? '等待候选':''
      switch (node.type){
        case 'Start':
          return '发起本流程';
        case 'Approval':
          return node.mode === 'USER' ? `${node.orgs.length}人 ${cd}审批（${this.getTaskMode(node.taskMode)}）` : '';
        case 'Task':
          return `${node.orgs.length}人 ${cd}办理（${this.getTaskMode(node.taskMode)}）`;
        case 'Cc':
          return `抄送 ${node.orgs.length}人`;
        case 'Subproc':
          return <div class="w-flex-col-ct">
            <w-org-tags inline disabled modelValue={[node.subProps?.initiator]}></w-org-tags>
            <el-text size="small">
              发起子流程[
              <el-text size="small" style="cursor: pointer;" type="primary" onClick={() => this.showSubproc(node)}>
                <el-icon><Link/></el-icon>
                {node.subProps?.name}
              </el-text>
              ]
            </el-text>
          </div>;
        default:
          return node.desc;
      }
    },
    showSubproc(node) {
      this.subprocVisible = true
      this.subprocNode = node
      const startParams = {
        code: node.subProps?.code,
        version: node.subProps?.version,
        startDeptId: node.subProps?.startDeptId,
        initiator: node.subProps?.initiator?.id,
        formData: this.formData,
        processData: {}
      }
      // 获取子流程的流程定义信息
      this.processLoading = true;
      getProcModelByVer(startParams.code, node.isBindVer ? startParams.version : null, true).then(res => {
        startParams.defineId = res.data.defineId;
        startParams.version = res.data.version;
        (!this.isMock ? getForecast(startParams) :
            getForecastMock(startParams, startParams.code, startParams.version)).then(res => {
          this.processLoading = false
          this.subproc.process = res.data
        }).catch(err => {
          this.processLoading = false
          ElMessage.error(err.msg || err)
        })
      })
    },
    getTaskMode(mode){
      if (!mode) return ''
      switch (mode.type){
        case 'NEXT': return '顺序会签';
        case 'AND': return '会签';
        case 'OR': return '或签';
        case 'CUSTOM': return `${mode.percentage}% 比例会签`;
      }
    }
  }
}
</script>

<style scoped lang="less">
.w-forecast {
  padding-left: 0;
  :deep(.w-forecast-node) {
    .el-timeline-item__node {
      padding: 10px;
      left: -5px;
    }

    .w-forecast-node-skip {
      .el-radio-button__inner {
        //color: var(--el-text-color-secondary);
        text-decoration: line-through !important;
      }

    }

    .w-forecast-node-users {
      display: flex;
      margin: 5px;
      flex-wrap: wrap;

      .w-avatar {
        width: 50px;
        overflow: hidden;
      }
    }
  }

  .w-node-add {
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;

    :deep(.el-button) {
      padding: 16.5px;
      margin-top: 5px;
    }
  }
}
</style>
