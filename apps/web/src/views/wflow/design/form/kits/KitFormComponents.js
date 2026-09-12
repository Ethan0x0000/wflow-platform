import Type from '../ValueType'
export default [
  {
    name: '人事行政',
    components: [
      {
        icon: 'icon-park-twotone:vacation',
        type: 'Leave',
        name: '请假套件',
        valueType: Type.object,
        props: {
          hideLabel: true,
          typeOptions: [
            {label: '事假', value: 0, rule: 'HALF_DAY'},
            {label: '产假', value: 1, rule: 'DAY'},
            {label: '调休假', value: 2, rule: 'HOUR'},
            {label: '年假', value: 3, rule: 'DAY'},
          ]
        }
      }]
  }
]
