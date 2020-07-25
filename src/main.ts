import Vue from 'vue'
import { ipcRenderer } from 'electron'
import Vuex from 'vuex'

Vue.use(Vuex)

import App from './App.vue'
import { store } from './store'

import { library } from '@fortawesome/fontawesome-svg-core'
import {
	faTimes,
	faTrashAlt,
	faCheckSquare,
	faCog,
	faExclamationTriangle,
	faCheckCircle
} from '@fortawesome/free-solid-svg-icons'
import { faSquare } from '@fortawesome/free-regular-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

Vue.config.productionTip = false

library.add(faTimes)
library.add(faTrashAlt)
library.add(faCheckSquare)
library.add(faSquare)
library.add(faCog)
library.add(faExclamationTriangle)
library.add(faCheckCircle)

Vue.component('fa', FontAwesomeIcon)

ipcRenderer.on('progressReport', console.log)

new Vue({
	render: (h) => h(App),
	store
}).$mount('#app')
