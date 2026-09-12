/**
 * 需要创建新的节点，统一在本js内进行配置
 */
import {getRandNodeId} from "@/utils/ProcessUtil.js";

const Nodes = import.meta.glob('./node/*.vue')
const NodeConfigs = import.meta.glob('./config/*.vue')

//批量导出所有的component下面的表单组件
export const NodeComponents = {}
Object.keys(Nodes).forEach((key) => {
  const name = key.replace(/^.+\/([^/]+)\.vue$/, '$1')
  NodeComponents[name] = defineAsyncComponent(Nodes[key])
})

export const NodeComponentConfigs = {}
Object.keys(NodeConfigs).forEach((key) => {
  const name = key.replace(/^.+\/([^/]+)\.vue$/, '$1')
  NodeComponentConfigs[name] = defineAsyncComponent(NodeConfigs[key])
})

const createGateway = (type) => {
  const id = getRandNodeId()
  return [
    {
      id: id + '_fork',
      type: 'Gateway',
      name: '网关节点',
      parentId: null,
      childId: null,
      props: {
        type: type,
        branch: [
          //默认创建俩分支
          ...branchNode[type].createSelf(1),
          ...branchNode[type].createSelf()
        ]
      },
      branch: [[], []] //默认要创建2个空分支
    },
    { //创建一个聚合节点
      id: id + '_join',
      type: 'Join',
      name: '网关聚合',
      parentId: null,
      childId: null,
      props: {
        type: type
      }
    }
  ]
}

//定义分支子节点
const branchNode = {
  Exclusive: {
    name: '互斥条件',
    icon: 'Share',
    color: '#1BB782',
    //创建自身
    createSelf(i) {
      return [{
        id: getRandNodeId(),
        type: 'Exclusive',
        name: i ? '条件' + i : '默认条件',
        parentId: null,
        childId: null,
        props: {
          logic: true, //组关系
          groups: [ //组条件
            {
              logic: true, //组内条件关系
              conditions: []
            }
          ]
        },
      }]
    },
    create() {
      return createGateway('Exclusive')
    }
  },
  Parallel: {
    name: '并行分支',
    icon: 'Operation',
    color: '#718dff',
    //创建自身
    createSelf(i) {
      return [{
        id: getRandNodeId(),
        type: 'Parallel',
        name: '并行路径' + (i ? i : 2),
        parentId: null,
        childId: null,
        props: {},
      }]
    },
    create() {
      return createGateway('Parallel')
    }
  },
  Inclusive: {
    name: '包容分支',
    icon: 'Connection',
    color: '#345DA2',
    //创建自身
    createSelf(i) {
      return [{
        id: getRandNodeId(),
        type: 'Inclusive',
        name: i ? '包容条件' + i : '默认条件',
        parentId: null,
        childId: null,
        props: {
          logic: true, //组关系
          groups: [ //组条件
            {
              logic: true, //组内条件关系
              conditions: []
            }
          ]
        },
      }]
    },
    create() {
      return createGateway('Inclusive')
    }
  },
}

//开始节点
const Start = {
  create() {
    return [{
      id: 'node_root',
      type: 'Start',
      name: '发起人',
      parentId: 'start', //默认开始事件ID是start
      childId: null,
      props: {
        formPerms:[], //表单字段权限
        operationPerms: [
          {name: '提交', alisa: '提交', action: 'complete', enable: true}
        ], //操作权限
        enableMountForm: false,
        mountForms: [], //挂载的表单的列表
        events: { //节点事件监听器
          async: true, //是否异步执行
          retry: 0, //异常重试次数
          enter: [], //进入节点
          leave: [], //离开节点
          created: [], //创建任务
          complete: [], //完成任务
        },
      },
    }]
  }
}

//审批节点
const Approval = {
  name: '审批人',
  icon: 'Stamp',
  color: '#EC8151',
  create() {
    return [{
      id: getRandNodeId(),
      type: 'Approval',
      name: '审批人',
      parentId: null,
      childId: null,
      props: {
        formPerms:[], //表单字段权限
        operationPerms: [
          {name: '同意', alisa: '同意', action: 'agree', enable: true},
          {name: '拒绝', alisa: '拒绝', action: 'reject', enable: true},
          {name: '转交', alisa: '转交', action: 'forward', enable: true},
          {name: '回退', alisa: '回退', action: 'fallback', enable: true},
          {name: '前加签', alisa: '前加签', action: 'beforeAdd', enable: true},
          {name: '后加签', alisa: '后加签', action: 'afterAdd', enable: true},
        ], //操作权限
        enableMountForm: false,
        mountForms: [],
        mode: 'USER', //审批方式：人工处理、自动通过、自动拒绝
        ruleType: 'ASSIGN_USER', //规则类型，用哪种审批规则
        customRuleType: null, //自定义规则
        taskMode: { //审批模式
          type: 'AND',
          percentage: 100,
        },
        candidate: false, //候选人模式
        needSign: false,
        assignUser: [], //指定人员
        nodeAssign: {
          nodeIds: [], //指定的节点ID
          multiple: false, //是否多选
        },
        leader: { //部门负责人
          level: 1,
          emptySkip: false
        },
        leaderTop: {
          level: 0, //级数
          toEnd: false, //直到终点还是指定级别数
          emptySkip: false
        },
        superior: {//上级
          level: 1,
          emptySkip: false
        },
        superiorTop: {//逐级上级
          level: 0, //级数
          toEnd: false, //直到终点还是指定级别数
          emptySkip: false
        },
        assignDept: {
          dept: [], //指定的部门
          type: 'LEADER', //部门主管
          nested: false, //是否包含子部门
          roles: [], //指定角色
          groups: [], //指定用户组
        },
        formDept: {
          dept: [], //指定的部门
          type: 'LEADER', //部门主管
          nested: false, //是否包含子部门
          roles: [], //指定角色
          groups: [], //指定用户组
        },
        dynamic: { //动态解析
          type: 'EL',
          script: 'return []',
          http: {}
        },
        assignGroup: [], //指定的用户组
        formUser: null, //表单字段指定人员
        assignRole: [],
        noUserHandler: { //无人时的处理规则
          type: 'TO_NEXT',
          assigned: []
        },
        sameRoot: {
          type: 'TO_SELF',
          assigned: []
        },
        rejectRule: { //审批拒绝规则
          type: 'END',
          target: null
        },
        timeout: { //超时处理
          enable: false,
          time: 1,
          timeUnit: 'M',
          type: 'TO_PASS', //自动通过
        },
        events: { //节点事件监听器
          async: true, //是否异步执行
          retry: 0, //异常重试次数
          enter: [], //进入节点
          leave: [], //离开节点
          created: [], //创建任务
          complete: [], //完成任务
          calcComplete: [] //计算人员完成
        },
      },
    }]
  }
}

//审批节点
const Task = {
  name: '办理人',
  icon: 'Checked',
  color: '#E6B039',
  create() {
    //办理节点和审批不一样，这里直接替换下操作项
    const props = Approval.create()[0].props
    props.operationPerms.splice(0, 2) //移除同意和拒绝
    props.operationPerms.unshift({name: '提交', alisa: '提交', action: 'complete', enable: true})
    return [{
      id: getRandNodeId(),
      type: 'Task',
      name: '办理人',
      parentId: null,
      childId: null,
      props: {
        ...props
      },
    }]
  }
}

//抄送节点
const Cc = {
  name: '抄送人',
  icon: 'Promotion',
  color: '#5994F3',
  create() {
    return [{
      id: getRandNodeId(),
      type: 'Cc',
      name: '抄送人',
      parentId: null,
      childId: null,
      props: {
        formPerms:[], //表单字段权限
        enableMountForm: false,
        mountForms: [],
        mode: 'USER', //审批方式：人工处理、自动通过、自动拒绝
        ruleType: 'ASSIGN_USER', //规则类型，用哪种审批规则
        customRuleType: null, //自定义规则
        taskMode: { //审批模式
          type: 'AND',
          percentage: 100,
        },
        candidate: false, //候选人模式
        needSign: false,
        assignUser: [], //指定人员
        rootAssign: {
          multiple: false, //是否多选
        },
        leader: { //部门负责人
          level: 1,
          emptySkip: false
        },
        leaderTop: {
          level: 0, //级数
          toEnd: false, //直到终点还是指定级别数
          emptySkip: false
        },
        superior: {//上级
          level: 1,
          emptySkip: false
        },
        superiorTop: {//逐级上级
          level: 0, //级数
          toEnd: false, //直到终点还是指定级别数
          emptySkip: false
        },
        assignDept: {
          dept: [], //指定的部门
          type: 'LEADER', //部门主管
          nested: false, //是否包含子部门
          roles: [], //指定角色
          groups: [], //指定用户组
        },
        formDept: {
          dept: [], //指定的部门
          type: 'LEADER', //部门主管
          nested: false, //是否包含子部门
          roles: [], //指定角色
          groups: [], //指定用户组
        },
        dynamic: { //动态解析
          type: 'EL',
          script: 'return []',
          http: {}
        },
        assignGroup: [], //指定的用户组
        formUser: null, //表单字段指定人员
        assignRole: [],
      },
    }]
  }
}

//等待节点
const Waiting = {
  name: '阻塞等待',
  icon: 'Timer',
  color: '#E04765',
  create() {
    return [{
      id: getRandNodeId(),
      type: 'Waiting',
      name: '阻塞等待',
      parentId: null,
      childId: null,
      props: {
        type: 'FIXED', //信号类型，定时信号，消息信号
        timeout: 1,
        timeUnit: 'M', //时间单位
        dataTime: null, //定时时间
        time: null,
        signalScope: 'processInstance', //是全局信号还是本实例的
        signal: null, //信号
      }
    }]
  }
}

//子流程节点
const Subproc = {
  name: '子流程',
  icon: 'money',
  color: '#9274E7',
  create() {
    return [{
      id: getRandNodeId(),
      type: 'Subproc',
      name: '子流程',
      parentId: null,
      childId: null,
      props: {
        formPerms:[], //表单字段权限
        enableMountForm: false,
        mountForms: [],
        code: null, //子流程的code编号
        name: null,
        defineId: null,
        version: null,
        initiatorType: 'PARENT', //发起人设置类型
        fixedUser: null,
        fixedDept: null,
        isBindVer: false, //是否绑定子流程版本
        isSyncAllVar: false, //是否同步所有主子变量
        isSyncBizKey: false, //业务主键同步
        isAsync: false, //是否异步发起子流程
        statusSync: false, //状态同步主流程
        formAutoMapping: true, //表单自动映射
        contextMap: [ //上下文数据映射
          {
            isFixed: false, //是否为固定值
            source: null, //源数据
            isVar: false, //是否是流程变量
            sync: false, //是否双向同步
            target: null
          }
        ], //上下文数据映射
      }
    }]
  }
}

//子流程节点
const Trigger = {
  name: '触发器',
  icon: 'SetUp',
  color: '#15bc83',
  create() {
    return [{
      id: getRandNodeId(),
      type: 'Trigger',
      name: '触发器',
      parentId: null,
      childId: null,
      props: {
        type: 'EL', //触发器类型
        el: null,
        jsCode: '//code here',
        signal: {
          name: null, //信号名称
          scope: 'INSTANCE', //信号范围 GLOBAL，PROCESS，INSTANCE，LOCAL
          code: null, //PROCESS 类型时的流程code
          instId: null //指定流程实例ID
        },
        http: {}
      }
    }]
  }
}

const Router = {
  name: '路由跳转',
  icon: 'Paperclip',
  color: '#ff4500',
  create() {
    return [{
      id: getRandNodeId(),
      type: 'Router',
      name: '路由跳转',
      parentId: null,
      childId: null,
      props: {
        hasCondition: false, //是否有条件
        logic: false, //组关系
        groups: [],
        target: null, //目标节点
      }
    }]
  }
}


export default {
  //人员相关节点
  Approval, Task, Cc, Start,
  //注入分支节点定义
  ...branchNode,
  //扩展功能节点
  Subproc, Waiting, Trigger,
  Router
}


