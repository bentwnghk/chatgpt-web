import type { Router } from 'vue-router'
import { useAuthStoreWithout } from '@/store/modules/auth'

export function setupPageGuard(router: Router) {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStoreWithout()
    if (to.meta?.needAuth && !authStore.token) {
      try {
        const data = await authStore.getSession()
        if (String(data.auth) === 'false' && authStore.token)
          authStore.removeToken()
          next({ name: 'login' })
      }
      catch (error:any) {
      	if (error?.status === 'Unauthorized') {
					next({ name: 'login' })
      		return;
				}
				next({ name: '500' })
      }
    }
    else {
      next()
    }
  })
}
