<template>
	<div class="login-container">
		<n-card shadow="hover">
			<n-form>
				<n-form-item class="btn-group" :aria-disabled="!ready">
					<n-button type="info" tag="a" :ghost="true" :href="zohoLoginURL" :disabled="inZohoCallback">
						<span v-if="!inZohoCallback">Login with Zoho</span>
						<span v-if="inZohoCallback">Loading</span>
					</n-button>
				</n-form-item>
				<n-form-item class="btn-group" :aria-disabled="!ready">
					<div id="g_login_wrap"></div>
				</n-form-item>
			</n-form>
		</n-card>
	</div>
</template>

<script lang='ts'>
import { getGoogleAuthURL, handleGoogleAuth, loadGoogleAuthConfig, getZohoAuthURL, getZohoAuthByCode } from '@/api'
import { useAuthStore } from '@/store'
import { defineComponent, ref, watch, computed, nextTick } from 'vue';
import { NCard, NForm, NFormItem, NButton } from 'naive-ui';
import { useRouter, useRoute } from 'vue-router';

export default defineComponent({
	name: "Login",

	components: {
		NCard,
		NForm,
		NFormItem,
		NButton,
	},

	setup() {
		const ready = ref(false);
		const GoogleConfig = ref<any>({});
		const loginURL = getGoogleAuthURL();
		const zohoLoginURL = getZohoAuthURL();
		const authStore = useAuthStore();
		const router = useRouter();
		const route = useRoute();
		const logined = ref(false);
		const inZohoCallback = computed(() => {
			const query = new URLSearchParams(location.search);
			const uc = query.get('accounts-server') || "";
			return query.has('code') && /accounts\.zoho\.com/i.test(uc);
		});

		function addScript() {
			if (!document.querySelector("#google_api_lib")) {
				let s = document.createElement('script');
				s.setAttribute("id", "google_api_lib");
				s.setAttribute('src', "https://accounts.google.com/gsi/client");
				document.head.appendChild(s);
			}
		}
		function loadScript() {
			addScript()
			return new Promise<void>(resolve => {
				let workerID:number|any = 0;
				//@ts-ignore
				const worker = () => {
					if (window.hasOwnProperty('google')) {
						clearInterval(workerID);
						resolve();
					}
				}
				workerID = setInterval(worker, 500);
				worker();
			});
		}

		function init(wrapper) {
			return new Promise((resolve) => {
				window.google?.accounts.id.initialize({
					...GoogleConfig.value,
					callback(json) {
						console.log(json);
						resolve(json)
					}
				});


				window.google?.accounts.id.renderButton(
					wrapper,
					{ theme: "outline", size: "large" }  // customization attributes
				);
			})
		}

		Promise.all([loadScript(), loadGoogleAuthConfig<any>()]).then(([_, config]) => {
			GoogleConfig.value = config?.data;
			// console.log(GoogleConfig);
			ready.value = true;

			nextTick(() => {
				const wrapper = document.querySelector('#g_login_wrap');
				init(wrapper).then(handleGoogleLogin);
			})
		});
		/**
		 * @ts-ignore
		 */
		function handleGoogleLogin(json:any) {
			ready.value = false;
			return handleGoogleAuth<any>(json?.credential || "")
				.then((json) => {
					// console.log(json);
					const token = json?.data?.session || "";
					if (token) {
						authStore.setToken(token);
						logined.value = true;
					}
				})
				.finally(() => {
					ready.value = true;
				})
		}

		watch(logined, (val) => {
			if (val) {
				router.push('/chat')
			}
		});


		// console.log(inZohoCallback, route.name);
		if (inZohoCallback) {
			const q = new URLSearchParams(location.search);
			getZohoAuthByCode(q.get("code"))
			.then((json) => {
				console.log(json);
				const token = json?.data?.session || "";
				if (token) {
					authStore.setToken(token);
					logined.value = true;
				}
			});
		}

		return {
			ready,
			loginURL,
			logined,
			authStore,
			handleGoogleLogin,
			zohoLoginURL,
			inZohoCallback,
		};
	},
})
</script>

<style>
.login-container {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 100vh;
	background-color: #f3f4f6;
}
.login-container .n-card {
	max-width: 500px;
}
.login-container .btn-group .n-form-item-blank {
	justify-content: center;
}
.login-container .btn-group .n-button {
	width: 100%;
}
</style>
