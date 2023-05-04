<template>
	<div class="login-container">
		<n-card shadow="hover">
			<n-form>
				<n-form-item class="btn-group">
					<n-button :disabled="!ready" type="primary" @click.stop="handleGoogleLogin()">Login With Google</n-button>
				</n-form-item>
			</n-form>
		</n-card>
	</div>
</template>

<script lang='ts'>
import { getGoogleAuthURL, handleGoogleAuth, loadGoogleAuthConfig } from '@/api'
import { useAuthStore } from '@/store'
import { defineComponent, ref, watch, computed } from 'vue';
import { NCard, NForm, NFormItem, NButton } from 'naive-ui';
import { useRouter } from 'vue-router';

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
		const authStore = useAuthStore();
		const router = useRouter();
		const logined = computed(() => {
			return !!(authStore.token);
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

		Promise.all([loadScript(), loadGoogleAuthConfig<any>()]).then(([_, config]) => {
			GoogleConfig.value = config?.data;
			// console.log(GoogleConfig);
			ready.value = true;
		});

		/**
		 * @ts-ignore
		 */
		function handleGoogleLogin() {
			ready.value = false;
			return new Promise<any>((resolve) => {
				// @ts-ignore
				google.accounts.id.initialize({
					...GoogleConfig.value,
					callback(json:any) {
						resolve(json)
					}
				});
				// @ts-ignore
				google.accounts.id.prompt();
			})
			.then((json) => {
				return handleGoogleAuth<any>(json?.credential || "");
			})
			.then((json) => {
				// console.log(json);
				authStore.setToken(json?.data?.session || "");
			})
			.finally(() => {
				ready.value = true;
			})
		}

		watch(logined, (val) => {
			if (val) {
				router.push('/chat')
			}
		})

		if (logined) {
			router.push('/chat')
		}

		return {
			ready,
			loginURL,
			logined,
			authStore,
			handleGoogleLogin,
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
