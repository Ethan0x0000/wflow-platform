import axios from "axios";
import {ElMessageBox} from "element-plus";
import {addHeaders} from "@/utils/GlobalFunc.js";
import {$debounce} from "@/utils/GlobalFunc.js";

const service = axios.create({
	baseURL: import.meta.env.VITE_APP_BASE_API || '/api',
	timeout: 50000
});

service.defaults.withCredentials = true; // 让ajax携带cookie
service.interceptors.request.use(
	// 每次请求都自动携带Cookie
	config => {
		addHeaders(config.headers)
		return config;
	},
	// eslint-disable-next-line handle-callback-err
	error => {
		return Promise.reject(error);
	}
);

//提示消抖函数，防止重复弹出提示
const loginTip = $debounce(() => {
	ElMessageBox({
		title: '提示',
		confirmButtonText: '朕知道了',
		message: '登录已失效，请点击右上角头像切换人员😥',
		type: 'warning',
	});
}, 1000);

//请求拦截器
service.interceptors.response.use(
	rsp => {
		if (rsp.status === 200) {
			//后端数据包了一层，rsp.data = {code: '', data: '', msg: ''}
			const contentType = rsp.headers['content-type'];
			if (contentType && contentType.includes('application/octet-stream')) {
				return Promise.resolve(rsp)
			} else {
				if (rsp.data.code === 200) {
					return Promise.resolve(rsp.data);
				} else if (rsp.data.code === 401) {
					loginTip()
				}
				return Promise.reject(rsp.data);
			}
		}
		return Promise.reject({msg: '系统异常😥'});
	},
	// 拦截异常的响应
	err => {
		return Promise.reject(err.response?.data || {msg: '系统请求异常: ' + err.message})
	}
);
export default service;
