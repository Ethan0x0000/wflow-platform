import {useWflowStore} from './modules/wflow'

// 统一导出useStore方法
export default function useStore() {
  return {
    wflow: useWflowStore(),
  }
}
