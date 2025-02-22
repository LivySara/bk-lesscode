<template>
    <lc-sideslider
        transfer
        :title="title"
        :is-show="isShow"
        :quick-close="true"
        :width="1200"
        @update:isShow="close">
        <section
            class="api-form-home"
            slot="content"
        >
            <h3 class="api-form-title">{{ $t('基本设置') }}</h3>
            <render-basic
                class="api-form"
                ref="basicRef"
                :form-data="formData"
                @update="handleUpdate"
            />
            <h3 class="api-form-title">{{ $t('默认请求头') }}</h3>
            <render-header
                class="api-form"
                ref="headerRef"
                :form-data="formData"
                :variable-list="variableList"
                :function-list="functionList"
                :api-list="apiList"
                @update="handleUpdate"
            />
            <h3 class="api-form-title">{{ $t('默认请求参数') }}</h3>
            <render-param
                class="api-form"
                ref="paramRef"
                :form-data="formData"
                :variable-list="variableList"
                :function-list="functionList"
                :api-list="apiList"
                @update="handleUpdate"
            />
            <h3 class="api-form-title">{{ $t('默认请求响应') }}</h3>
            <render-response
                class="api-form"
                ref="responseRef"
                :form-data="formData"
                :response="response"
                :variable-list="variableList"
                :function-list="functionList"
                :api-list="apiList"
                @update="handleUpdate"
            >
                <bk-button
                    class="mt10 mr10"
                    size="small"
                    :loading="isLoadingResponse"
                    v-bk-tooltips="{ content: $t('立即发送请求来获取请求响应，响应示例去除了数组中重复的部分，可以在响应结果字段提取中进行二次编辑'), maxWidth: 400 }"
                    @click="getApiResponse"
                >{{ $t('获取请求响应') }}</bk-button>
            </render-response>
        </section>
        <section
            class="api-footer"
            slot="footer"
        >
            <bk-button
                theme="primary"
                class="mr10"
                :loading="isSubmitting"
                @click="submitApi"
            >{{ $t('提交') }}</bk-button>
            <bk-button
                @click="handleClose"
            >{{ $t('取消') }}</bk-button>
        </section>
    </lc-sideslider>
</template>

<script>
    import RenderBasic from './basic.vue'
    import RenderHeader from './header.vue'
    import RenderParam from './param.vue'
    import RenderResponse from './response.vue'
    import {
        defineComponent,
        ref,
        watch,
        computed
    } from '@vue/composition-api'
    import {
        parseScheme2Value,
        getDefaultApi,
        METHODS_WITHOUT_DATA
    } from 'shared/api'
    import { useStore } from '@/store'
    import { useRoute } from '@/router'
    import {
        messageError
    } from '@/common/bkmagic'
    import {
        leaveConfirm
    } from '@/common/leave-confirm'
    // import useResource from '@/hooks/use-resource'

    export default defineComponent({
        components: {
            RenderBasic,
            RenderHeader,
            RenderParam,
            RenderResponse
        },

        props: {
            title: {
                type: String
            },
            isShow: {
                type: Boolean,
                require: true
            },
            form: {
                type: Object
            },
            isEdit: {
                type: Boolean
            }
        },

        setup (props, { emit }) {
            // const {
            //     getApiList,
            //     getFunctionList,
            //     getProjectVariableList
            // } = useResource()
            // 状态
            const isSubmitting = ref(false)
            const isLoadingResponse = ref(false)
            const variableList = ref([])
            const functionList = ref([])
            const apiList = ref([])
            const formData = ref({})
            const response = ref()
            const basicRef = ref(null)
            const headerRef = ref(null)
            const paramRef = ref(null)
            const responseRef = ref(null)
            
            // use data
            const store = useStore()
            const route = useRoute()
            // 计算变量
            const paramKey = computed(() => {
                if (METHODS_WITHOUT_DATA.includes(formData.value.method)) {
                    return 'query'
                } else {
                    return 'body'
                }
            })

            const close = () => {
                emit('update:isShow', false)
                emit('update:form', {})
            }

            const handleClose = () => {
                leaveConfirm(window.i18n.t('存在未保存的 API，关闭后不会保存更改'))
                    .then(() => {
                        close()
                    })
            }

            const validate = () => {
                return new Promise((resolve, reject) => {
                    Promise
                        .all([
                            basicRef.value?.validate(),
                            headerRef.value?.validate(),
                            paramRef.value?.validate(),
                            responseRef.value?.validate()
                        ])
                        .then((res) => {
                            resolve(res)
                        })
                        .catch((err) => {
                            messageError(err.content || err.message || err)
                            reject(err.message || err)
                        })
                })
            }

            const submitApi = () => {
                isSubmitting.value = true
                validate()
                    .then(([
                        basicData,
                        headerData,
                        paramData,
                        responseData
                    ]) => {
                        const form = {
                            projectId: route.params.projectId,
                            ...basicData,
                            ...headerData,
                            ...paramData,
                            ...responseData
                        }
                        const submitMethod = formData.value.id ? editApi : createApi
                        return submitMethod(form).then(() => {
                            window.leaveConfirm = false
                            emit('success-submit')
                            close()
                        })
                    })
                    .finally(() => {
                        isSubmitting.value = false
                    })
            }

            const createApi = (form) => {
                return store.dispatch('api/createApi', form)
            }

            const editApi = (form) => {
                return store.dispatch('api/editApi', form)
            }

            const handleUpdate = (formItem) => {
                window.leaveConfirm = true
                Object.assign(formData.value, formItem)
            }

            const getApiResponse = () => {
                // 此处为相应示例，可以去除部分重复的 array 中的数据
                const processResponse = (response) => {
                    let result = response
                    const type = Object.prototype.toString.apply(response)
                    if (type === '[object Object]') {
                        result = {}
                        Object.keys(response).forEach((key) => {
                            result[key] = processResponse(response[key])
                        })
                    }
                    if (type === '[object Array]') {
                        result = [processResponse(response[0])]
                    }
                    return result
                }
                validate()
                    .then(([
                        basicData,
                        headerData,
                        paramData
                    ]) => {
                        // http data
                        let apiData = {}
                        if (paramKey.value === 'query') {
                            paramData.query.forEach((queryItem) => {
                                if (queryItem.name) {
                                    apiData[queryItem.name] = parseScheme2Value(queryItem)
                                }
                            })
                        } else {
                            apiData = parseScheme2Value(paramData.body)
                        }
                        // http header
                        const header = headerData.header?.reduce?.((acc, cur) => {
                            if (cur.name) {
                                acc[cur.name] = parseScheme2Value(cur)
                            }
                            return acc
                        }, {}) || {}
                        const httpData = {
                            url: basicData.url,
                            type: basicData.method,
                            apiData,
                            withToken: basicData.withToken,
                            header
                        }
                        isLoadingResponse.value = true
                        return store
                            .dispatch('getApiData', httpData)
                            .then((res) => {
                                response.value = processResponse(res)
                            })
                            .catch((err) => {
                                messageError(err.message || err)
                            })
                            .finally(() => {
                                isLoadingResponse.value = false
                            })
                    })
            }

            watch(
                () => props.form,
                () => {
                    formData.value = JSON.parse(JSON.stringify(Object.assign(getDefaultApi(), props.form)))
                },
                {
                    immediate: true
                }
            )

            // onBeforeMount(() => {
            //     Promise.all([
            //         getApiList(),
            //         getFunctionList(),
            //         getProjectVariableList()
            //     ]).then(([api, fun, vars]) => {
            //         apiList.value = api
            //         functionList.value = fun
            //         variableList.value = vars
            //     })
            // })

            return {
                isSubmitting,
                isLoadingResponse,
                variableList,
                functionList,
                apiList,
                formData,
                response,
                basicRef,
                headerRef,
                paramRef,
                responseRef,
                paramKey,
                close,
                handleClose,
                submitApi,
                handleUpdate,
                getApiResponse
            }
        }
    })
</script>

<style lang="postcss" scoped>
    .api-form-home {
        padding: 20px 30px;
        height: calc(100vh - 114px);
    }
    .api-form-title {
        color: #444;
        font-size: 14px;
        margin: 0;
        position: relative;
        line-height: 40px;
        margin-bottom: 5px;
    }
    .api-form {
        margin-bottom: 25px;
        &:last-child {
            padding-bottom: 30px;
        }
    }
    .api-footer {
        padding-left: 30px;
    }
</style>
