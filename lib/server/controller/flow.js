/**
 * Tencent is pleased to support the open source community by making 蓝鲸智云PaaS平台社区版 (BlueKing PaaS Community Edition) available.
 * Copyright (C) 2017-2024 THL A29 Limited, a Tencent company. All rights reserved.
 * Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * http://opensource.org/licenses/MIT
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on
 * an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

import { execApiGateWay } from '@bkui/apigateway-nodejs-sdk'
import dayjs from 'dayjs'
import {
    Controller,
    OutputJson,
    Get,
    Post,
    Put,
    Delete,
    BodyParams,
    QueryParams,
    HeaderParams,
    PathParams,
    SessionParams,
    CookieParams,
    ProjectAuthorization,
    ProjectResAuthorization,
} from '../decorator'
import { LCDataService, TABLE_FILE_NAME } from '../service/common/data-service'
import httpConf from '../conf/http'
import flowConf from '../conf/flow'
import { transFlowTplToBkFlowPipelineTree } from '../utils/flow'

const authorization = {
    bk_app_code: flowConf.APP_CODE,
    bk_app_secret: flowConf.APP_SECRET
}

@Controller('/api/flow')
export default class NoCodeController {
    // 获取项目下流程模板列表
    @OutputJson()
    @ProjectAuthorization({})
    @Get('/tpl')
    async getFlowTplList (
        @HeaderParams({ name: 'x-project-id', require: true }) projectId,
        @QueryParams({ name: 'page' }) page,
        @QueryParams({ name: 'pageSize' }) pageSize,
        @QueryParams({ name: 'deleteFlag', default: 0 }) deleteFlag,
        @QueryParams({ name: 'name' }) name
    ) {
        const query = Object.assign({
            projectId,
            deleteFlag
        }, (name ? { name: `%${name}%` } : {}))
        const { list, count } = await LCDataService.get({
            tableFileName: TABLE_FILE_NAME.FLOW_TPL,
            page,
            pageSize,
            query
        })
        return { list, count }
    }

    // 新增流程模板
    @OutputJson()
    @ProjectAuthorization({})
    @Post('/tpl')
    async createFlowTpl (
        @HeaderParams({ name: 'x-project-id', require: true }) projectId,
        @BodyParams({ name: 'name', require: true }) name,
        @BodyParams({ name: 'summary', default: '' }) summary,
        @BodyParams({ name: 'nodes', require: true, default: '[]' }) nodes,
        @BodyParams({ name: 'edges', require: true, default: '[]' }) edges,
        @BodyParams({ name: 'deployed', default: 0 }) deployed,
    ) {
        return LCDataService.add(TABLE_FILE_NAME.FLOW_TPL, { name, summary, nodes, edges, deployed, projectId })
    }

    // 获取流程模板详情
    @OutputJson()
    @ProjectAuthorization({})
    @Get('/tpl/:tplId')
    async getFlowTplDetail (
        @PathParams({ name: 'tplId', require: true }) tplId
    ) {
        const tplDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id: tplId })
        return tplDetail
    }

    // 更新流程模板
    @OutputJson()
    @ProjectAuthorization({})
    @Put('/tpl/:tplId')
    async updateFlowTpl (
        @HeaderParams({ name: 'x-project-id', require: true }) projectId,
        @PathParams({ name: 'tplId', require: true }) tplId,
        @BodyParams({ name: 'name', require: true }) name,
        @BodyParams({ name: 'summary', default: '' }) summary,
        @BodyParams({ name: 'nodes', require: true, default: '[]' }) nodes,
        @BodyParams({ name: 'edges', require: true, default: '[]' }) edges,
        @BodyParams({ name: 'deployed', default: 0 }) deployed
    ) {
        return LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id: tplId, name, summary, nodes, edges, deployed, projectId })
    }

    // 归档/恢复流程模板
    @OutputJson()
    @ProjectResAuthorization({ tableName: 'FLOW_TPL' })
    @Put('/archive')
    async archiveFlowTpl (
        @BodyParams({ name: 'id' }) id,
        @BodyParams({ name: 'deleteFlag' }) deleteFlag
    ) {
        const flowDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id })
        if (!flowDetail) {
            throw new global.BusinessError(global.i18n.t('流程id不存在'), -1)
        }
        await LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id, deleteFlag })

        return flowDetail
    }

    // 新增流程节点
    @OutputJson()
    @ProjectAuthorization({})
    @Post('/tpl/:tplId/node')
    async createFlowNode (
        @PathParams({ name: 'tplId', require: true }) tplId,
        @BodyParams({ name: 'data', require: true }) data
    ) {
        const flowDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id: tplId })
        if (!flowDetail) {
            throw new global.BusinessError(global.i18n.t('流程id不存在'), -1)
        }

        const nodes = JSON.parse(flowDetail.nodes || '[]')
        if (nodes.findIndex(item => item.id === data.id) === -1) {
            nodes.push(data)
        }

        return LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id: tplId, nodes: JSON.stringify(nodes) })
    }

    // 更新流程节点
    @OutputJson()
    @ProjectAuthorization({})
    @Put('/tpl/:tplId/node/:nodeId')
    async updateFlowNode (
        @PathParams({ name: 'tplId', require: true }) tplId,
        @PathParams({ name: 'nodeId', require: true }) nodeId,
        @BodyParams({ name: 'data', require: true }) data
    ) {
        const flowDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id: tplId })
        if (!flowDetail) {
            throw new global.BusinessError(global.i18n.t('流程id不存在'), -1)
        }

        const nodes = JSON.parse(flowDetail.nodes || '[]')
        const index = nodes.findIndex(v => v.id === nodeId)
        if (index > -1) {
            nodes.splice(index, 1, data)
        } else {
            throw new global.BusinessError(global.i18n.t('流程节点不存在'), -1)
        }

        return LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id: tplId, nodes: JSON.stringify(nodes) })
    }

    // 删除流程节点
    @OutputJson()
    @ProjectAuthorization({})
    @Delete('/tpl/:tplId/node/:nodeId')
    async deleteFlowNode (
        @PathParams({ name: 'tplId', require: true }) tplId,
        @PathParams({ name: 'nodeId', require: true }) nodeId
    ) {
        const flowDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id: tplId })
        if (!flowDetail) {
            throw new global.BusinessError(global.i18n.t('流程id不存在'), -1)
        }

        const nodes = JSON.parse(flowDetail.nodes || '[]')
        let edges = JSON.parse(flowDetail.edges || '[]')

        const index = nodes.findIndex(v => v.id === nodeId)
        if (index > -1) {
            nodes.splice(index, 1)
            edges = edges.filter(edge => edge.source.cell !== nodeId && edge.target.cell !== nodeId)
        } else {
            throw new global.BusinessError(global.i18n.t('流程节点不存在'), -1)
        }
        return LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id: tplId, nodes: JSON.stringify(nodes), edges: JSON.stringify(edges) })
    }

    // 新增流程边
    @OutputJson()
    @ProjectAuthorization({})
    @Post('/tpl/:tplId/edge')
    async createFlowEdge (
        @PathParams({ name: 'tplId', require: true }) tplId,
        @BodyParams({ name: 'data', require: true }) data
    ) {
        const flowDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id: tplId })
        if (!flowDetail) {
            throw new global.BusinessError(global.i18n.t('流程id不存在'), -1)
        }

        const edges = JSON.parse(flowDetail.edges || '[]')
        if (edges.findIndex(item => item.id === data.id) === -1) {
            edges.push(data)
        }
        return LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id: tplId, edges: JSON.stringify(edges) })
    }

    // 删除流程边
    @OutputJson()
    @ProjectAuthorization({})
    @Delete('/tpl/:tplId/edge/:edgeId')
    async deleteFlowEdge (
        @PathParams({ name: 'tplId', require: true }) tplId,
        @PathParams({ name: 'edgeId', require: true }) edgeId
    ) {
        const flowDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id: tplId })
        if (!flowDetail) {
            throw new global.BusinessError(global.i18n.t('流程id不存在'), -1)
        }

        const edges = JSON.parse(flowDetail.edges || '[]')
        const index = edges.findIndex(e => e.id === edgeId)
        if (index > -1) {
            edges.splice(index, 1)
        } else {
            throw new global.BusinessError(global.i18n.t('流程边不存在'), -1)
        }
        return LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id: tplId, edges: JSON.stringify(edges) })
    }

    // 创建流程任务
    @OutputJson()
    @ProjectAuthorization({})
    @Post('/tpl/:tplId/createTask')
    async createFlowTask (
        @SessionParams({ name: 'userInfo' }) userInfo,
        @CookieParams({ name: global.AUTH_NAME }) bkToken,
        @HeaderParams({ name: 'x-project-id', require: true }) projectId,
        @PathParams({ name: 'tplId', require: true }) tplId,
    ) {
        const flowDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id: tplId })
        if (!flowDetail) {
            throw new global.BusinessError(global.i18n.t('流程id不存在'), -1)
        }

        const nodes = JSON.parse(flowDetail.nodes || '[]')
        const edges = JSON.parse(flowDetail.edges || '[]')
        const pipelineTree = transFlowTplToBkFlowPipelineTree(nodes, edges)
        const taskName = `${flowDetail.name}_${dayjs().format('YYYYMMDDHHmmss')}`

        const res = await execApiGateWay({
            apiName: 'bkflow-eng-svc',
            path: `/space/141/create_task_without_template`, // @todo BkFlow需要传空间id
            method: 'post',
            authorization: {
                ...authorization,
                [global.AUTH_NAME]: bkToken
            },
            apiUrlTemp: httpConf.apiGateWayUrlTmpl,
            stageName: flowConf.STAGE_NAME,
            data: {
                creator: userInfo.username,
                pipeline_tree: pipelineTree,
                name: taskName,
                scope_type: "project_tpl",
                scope_value: `${projectId}_${tplId}`
            }
        })
        if (res.result) {
            await LCDataService.add(TABLE_FILE_NAME.FLOW_TASK, { projectId, tplId, bkFlowTaskId: res.data.id, nodes: flowDetail.nodes, edges: flowDetail.edges})
        } else {
            throw new global.BusinessError(`${global.i18n.t('任务创建失败')}: ${res.message}`, -1)
        }

        return { result: true, data: '' }
    }

    // 获取流程任务列表
    @OutputJson()
    @ProjectAuthorization({})
    @Get('/tpl/:tplId/task/list')
    async getFlowListByTpl (
        @CookieParams({ name: global.AUTH_NAME }) bkToken,
        @HeaderParams({ name: 'x-project-id', require: true }) projectId,
        @PathParams({ name: 'tplId', require: true }) tplId,
        @QueryParams({ name: 'page' }) page,
        @QueryParams({ name: 'pageSize' }) pageSize
    ) {
        const { list, count } = await LCDataService.get({
            tableFileName: TABLE_FILE_NAME.FLOW_TASK,
            page,
            pageSize,
            deleteFlag: 0
        })

        const taskIds = list.map(item => item.bkFlowTaskId)

        // 调用BkFlow接口查询任务的执行状态
        const tasksStatusRes = await execApiGateWay({
            apiName: 'bkflow-eng-svc',
            path: `/space/141/get_tasks_states/`,
            method: 'post',
            authorization: {
                ...authorization,
                [global.AUTH_NAME]: bkToken
            },
            apiUrlTemp: httpConf.apiGateWayUrlTmpl,
            stageName: flowConf.STAGE_NAME,
            data: {
                task_ids: taskIds
            }
        })

        list.forEach(task => {
            task.status = tasksStatusRes.data[task.bkFlowTaskId]?.state || ''
        })

        return { list, count }
    }

    // 部署流程模板
    @OutputJson()
    @ProjectAuthorization({})
    @Post('/tpl/:tplId/updateDeployStatus/')
    async updateDeployStatus(
        @CookieParams({ name: global.AUTH_NAME }) bkToken,
        @PathParams({ name: 'tplId', require: true }) tplId,
        @BodyParams({ name: 'deployed', require: true }) deployed

     ) {
         const flowDetail = await LCDataService.findOne(TABLE_FILE_NAME.FLOW_TPL, { id: tplId })
         if (!flowDetail) {
             throw new global.BusinessError(global.i18n.t('流程id不存在'), -1)
         }
 
         if (deployed) {
             const nodes = JSON.parse(flowDetail.nodes || '[]')
             const edges = JSON.parse(flowDetail.edges || '[]')

             const taskNodes = nodes.filter(item => !['Start', 'End'].includes(item.type))

             if (taskNodes.some(item => item.isDraft)) {
                throw new global.BusinessError(global.i18n.t('部署失败，请检查接节点、连线配置是否完整'), -1)
             }

             const pipelineTree = transFlowTplToBkFlowPipelineTree(nodes, edges)
             const res = await execApiGateWay({
                 apiName: 'bkflow-eng-svc',
                 path: `/space/141/validate_pipeline_tree`,
                 method: 'post',
                 authorization: {
                     ...authorization,
                     [global.AUTH_NAME]: bkToken
                 },
                 apiUrlTemp: httpConf.apiGateWayUrlTmpl,
                 stageName: flowConf.STAGE_NAME,
                 data: {
                     pipeline_tree: pipelineTree
                 }
             })
             if (res.result) {
                await LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id: tplId, deployed: 1 })
             } else {
                throw new global.BusinessError(global.i18n.t('部署失败，请检查接节点、连线配置是否完整'), -1)
             }
         } else {
                await LCDataService.update(TABLE_FILE_NAME.FLOW_TPL, { id: tplId, deployed: 0 })
         }
 
         return { result: true, data: '', message: '修改成功' }
     }
}
