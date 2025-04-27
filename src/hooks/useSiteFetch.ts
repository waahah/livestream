import { cookies } from "../store"

import { decompressFromBase64, compressToBase64 } from 'lz-string';

// const baseUrl = 'http://localhost:8000/api/'
const baseUrl = 'https://live.muxia.fun/api2/'
const baseUrlSync = 'https://lemonlive.deno.dev/api/'
const dyUrl = 'https://lemonlive-dy.deno.dev/dy'


export const useSiteFetch = (id: siteId, method: LiveSiteMethod, params: QueryParams = {}) => {
  params['token'] = (Date.now() / 1000 | 0).toString(16)
  //if (id == 'douyin') params.cookie = cookies[id]
  let savecookie='mycookie';
  let n=0;
  if (id == 'douyin') {
    fetch(`https://lemonlive-dy.deno.dev/dy?${new URLSearchParams(params as any).toString()}`)
      .then(async response => {
        try {
          // 1. 读取响应文本并解析为 JSON
          const text = await response.text();
          const data = JSON.parse(text);

          // 2. 如果包含 cookie，则更新页面元素和本地存储
          if (data.cookie) {
            // 假设 sU 是一个输入框或隐藏域
            params['cookie'] = data.cookie;
            savecookie = data.cookie;
            n++;
            

            // 假设 sf 是封装好的存储工具：key, value, 过期秒数, path, domain
            useCookie.setItem("dyc", data.cookie, 3600, "/", "");
          }

          console.log(n, savecookie);
          // 3. 返回解析后的数据，供后续 .then 链使用
          return data;

        } catch (err) {
          // JSON 解析或后续处理出错
          console.error("解析或处理响应出错：", err);
          // 抛出错误让后续 .catch 捕获
          throw err;
        }
      }).then(data => {
        console.log(data.cookie);
        return useFetch(`${baseUrl}${id}/${method}?${new URLSearchParams(params as any).toString()}`);
      }).catch(err => {
        console.error("请求出错：", err);
      });
  }
  console.log(savecookie, `${baseUrl}${id}/${method}?${new URLSearchParams(params as any).toString()}&cookie=${savecookie}`);
  //return useFetch(`${baseUrl}${id}/${method}?${new URLSearchParams(params as any).toString()}`)
  return useFetch(`${baseUrl}${id}/${method}?${new URLSearchParams(params as any).toString()}&cookie=ttwid=1|gRzLTVwNolrHAIJ46O8OcgwlGMayRiPXSAMNJ5BpiJU|1745613338|40c9e19cd7c6be2ae0608102a905c4005beb2bf22be5dc66a5f284f57a89c84a`);
}



export const useCheckFollows = async (site: site) => {
  const ids = Object.keys(site.follows)
  if (!ids.length) return Promise.resolve(false)
  if (site.id == 'douyin') {
    const list = await asyncPool(ids, 4, (id) => useSiteFetch('douyin', 'getLiveStatus', { id }))
    list.forEach((data, i) => site.follows[ids[i]].status = data[ids[i]].status)
    return
    // let i = 0
    // return new Promise((resolve) => {
    //   run()
    //   function run() {
    //     new Promise(() => {
    //       useSiteFetch('douyin', 'getLiveStatus', { id: ids[i] }).then(
    //         (data: any) => {
    //           console.log(i, ids[i], data)
    //           site.follows[ids[i]].status = data[ids[i]].status
    //           i++
    //           if (i < ids.length) run()
    //           else resolve('')
    //         }
    //       )
    //     }) 
    //   }
    // })
  }

  await useSiteFetch(site.id, 'getLiveStatus', { id: ids.join(',') }).then(data =>
    Object.keys(data).forEach(id => {
      site.follows[id].status = data[id].status
    })
  )
}


export const useSyncPush = (body: string) => useFetch(`${baseUrlSync}sync`, { method: 'POST', body })
export const useSyncPull = (key: string) => useFetch(`${baseUrlSync}sync/${key}`)

export const useFetch = (url: string, init?: RequestInit) => fetch(url, init).then(async res => {
  // if (!res.ok) return Promise.reject(res.statusText)
  // const data = await res.json()
  // if (data.code != 200) {
  //   return Promise.reject(data.msg)
  // }
  // return data.data
  if (res.status != 200) {
    return Promise.reject(res.statusText);
  }
  // 1. 拿到压缩过的 Base64 字符串
  const compressed: string = await res.text();

  // 2. 用 lz-string 解压
  const decompressed: string | null = decompressFromBase64(compressed);
  if (decompressed === null) {
    return Promise.reject('解压失败');
  }
  // 3. 如果是 JSON 数据，再 parse 一下
  const data = JSON.parse(decompressed);
  console.log(data);
  if (data.code != 200) {
    return Promise.reject(data.msg);
  }
  return data.data;

}, e => {
  console.log(e.message);
  Promise.reject('网络异常！')
})