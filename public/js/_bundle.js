const $ = selector => document.querySelector(selector)
const $$ = selector => document.querySelectorAll(selector)

const MovingAvgCount = 5;
const ExpoSmoothFactor = 0.3;
const MODELS_NAMES = { ess: "Exponential Smoothing", mavg: "Moving Average", lg: "Linear Regression" }

let AllDependents,materials, products
document.querySelector("[data-form]").addEventListener("submit", async e => {
    e.preventDefault()
    AllDependents = {}
    materials=[]
    products=[]
    if (!validateForm(e)) return
    getData()

    let totalBudjetConsumed = 0, totalProfit = 0
    await Promise.all(products.map(async (prod) => {
        const c = prod.dependents.reduce((total, dep) => total + materials[dep[0]].price * dep[1], 0)
        const h = ($("#inventoryIntrest").value * 0.01 * c)
        const k = parseFloat($("#inviteCost").value)
        const { lamda, model } = await getLamda(prod.demands)
        const Q = lamda //Math.sqrt((2 * k * lamda) / h)
        const GQ = (k * lamda / Q) + (Q * h / 2) + (lamda * c)
        prod.params = { c, h, k, lamda, model, Q, GQ }
        totalBudjetConsumed += GQ
        totalProfit += Q * prod.price - GQ
    }))

    if (totalBudjetConsumed < parseFloat($("#budget").value)) {
        var loan = 0
    }
    else {
        let loanIntrest = 0
        while (loanIntrest <= 0 || isNaN(loanIntrest)) {
            loanIntrest = parseFloat(prompt(`you are missing ${(totalBudjetConsumed - parseFloat($("#budget").value)).toFixed(2)} dollars, what is the intrest for loan (%)?`))
        }
        var loan = parseFloat(((totalBudjetConsumed - $("#budget").value) * (1 + loanIntrest / 100)).toFixed(2))
    }

    let totalInventoryConsumed = 0, netProfit = 0
    products.forEach((prod) => {
        if (loan != 0) {
            prod.params.Q = ($("#budget").value / totalBudjetConsumed) * prod.params.Q
            netProfit += prod.params.Q * prod.price - prod.params.GQ
        }
        totalInventoryConsumed += parseFloat((prod.params.Q * prod.volume).toFixed(2))
    })
    const expectedProfit = parseFloat((totalProfit - netProfit).toFixed(2))

    let upgrade = 0
    if (totalInventoryConsumed > parseFloat($("#inventoryMaxLevel").value)) {
        while (upgrade <= 0 || isNaN(upgrade)) {
            upgrade = (parseFloat(prompt(`you are missing ${totalInventoryConsumed - $("#inventoryMaxLevel").value} meters squared, how much will the upgrade cost?`)))
        }
    }
    const results = $("#results")
    $$("#results>*:not(template)").forEach((child) => {
        child.remove()
    })
    const res = results.querySelector("template").content.cloneNode(true)
    if (expectedProfit > loan + upgrade) {

        let message = `Worth it, Expected profit: ${expectedProfit}`
        message += (loan == 0) ? "" : `<br>Loan after intrest: ${loan}`
        message += (upgrade == 0) ? "" : `<br>Inventory upgrade cost: ${upgrade}`
        message += (loan == 0 && upgrade == 0) ? "" : `<br>Net profit: ${(expectedProfit - loan - upgrade).toFixed(2)}`
        res.querySelector("[message]").innerHTML = message
        products.forEach((prod) => {
            const tr = res.querySelector("template").content.cloneNode(true)
            tr.querySelectorAll("[key]").forEach((td) => {
                const tdKey = td.getAttribute("key").split(".")
                let val = prod
                while (tdKey.length > 0) {
                    val = val[tdKey.splice(0, 1)]
                }
                if (typeof val == "object") td.innerHTML = strDependencies(val)
                else td.innerHTML = val
                tr.append(td)
            })
            res.querySelector("tbody").append(tr)
        })
        res.querySelector("tbody>template").remove()
        strAllDependents(res.querySelector("[dependents]"))
    }
    else {
        const message = `Investment isn't profitable.<br>Expected profit: ${expectedProfit},<br>Costs: ${loan + upgrade}`
        res.querySelector("[message]").innerHTML = message
        res.querySelector("table").remove()
        res.querySelector(".overall-dep").remove()
    }
    results.append(res)
    // console.log(AllDependents);
    location = location.origin + location.pathname + "#results"
})

function getData() {
    $("#rawMaterials").querySelectorAll("tbody>tr").forEach((row) => {
        const matData = {}
        row.querySelectorAll("input").forEach((inp) => matData[inp.name] = inp.value)
        materials.push(matData)
    })

    ;[...$("#Products>tbody").children].forEach((prdtRow, i) => {
        const prodInfo = {};
        ;[...prdtRow.children].forEach((td) => {
            const inp = td.querySelector("input")
            if (inp == undefined || inp.name == "") return
            prodInfo[inp.name] = inp.value
        })
        const more = $(`[data-dependents]>[data-dependent='${i + 1}']`)
        more.querySelectorAll("input[name]").forEach((inp) => {
            prodInfo[inp.name] = inp.value
        })
        const dependents = []; //[ [id,quantity], [id,quantity] ]
        ;[...more.querySelector("tbody").children].forEach((depRow) => {
            const mat = []
            mat.push(depRow.querySelector("select").value)
            mat.push(depRow.querySelector("input").value)
            dependents.push(mat)
        })
        prodInfo.dependents = dependents
        const demands = [];
        ;[...more.querySelector("[data-demands]").children].forEach((demand) => {
            demands.push(parseFloat(demand.querySelector("input").value))
        })
        prodInfo.demands = demands
        products.push(prodInfo)
    });
}

async function getLamda(demands) {
    const data = { 'mavg': {}, 'ess': {}, 'lg': {} }
    data.demands = demands
    data.mavg.forcast = movingAvg(data.demands, MovingAvgCount).slice(0, -1)
    data.mavg.forcast_last = movingAvg(data.demands, MovingAvgCount).slice(-1)[0]
    data.mavg.MSE = MSE(data.demands, data.mavg.forcast)
    data.ess.forcast = (await expoSmooth(data.demands, ExpoSmoothFactor)).slice(0, -1)
    data.ess.forcast_last = (await expoSmooth(data.demands, ExpoSmoothFactor)).slice(-1)[0]
    data.ess.MSE = MSE(data.demands, data.ess.forcast)
    data.lg.forcast = linPredict(data.demands).slice(0, -1)
    data.lg.forcast_last = linPredict(data.demands).slice(-1)[0]
    data.lg.MSE = MSE(data.demands, data.lg.forcast)
    let bestModelMSE = Infinity, bestModelName
    for (const [modelName, model] of Object.entries(data)) {
        if (!["mavg", "ess", "lg"].includes(modelName)) continue
        if (model.MSE < bestModelMSE && model.forcast_last > 0) {
            bestModelMSE = model.MSE
            bestModelName = modelName
        }
    }
    console.log(data);
    return { lamda: Math.ceil(data[bestModelName].forcast_last), model: MODELS_NAMES[bestModelName] } //lamda
}

function validateForm(e) {
    let isValid = true
    const form = e.target
    const matsIDs = []
    form.querySelectorAll("[required]").forEach((inp) => {
        if (!isValid) return
        const hiddenContainer = inp.closest(".product_dependencies")
        if (hiddenContainer != null) {
            const id = hiddenContainer.getAttribute("data-dependent")
            const tr = $(`#Products tbody`).children[id - 1]
            const btn = tr.querySelector("td:last-of-type").firstElementChild
            if (!inp.reportValidity()) btn.click()
        }
        if (inp.name == "matID") matsIDs.push(inp.value)
        isValid = isValid && inp.reportValidity()
    })
    if (findDuplicates(matsIDs).length > 0) {
        alert(`Materials IDs have to be unique.\n(Duplicated ID: '${findDuplicates(mats)[0]}')`)
        return false
    }
    return isValid
}

function findDuplicates(arr) {
    const duplicated = arr.filter((item, index) => arr.indexOf(item) != index)
    return duplicated
}

function strDependencies(arr) {
    let text = ''
    arr.forEach(([id, quan]) => {
        AllDependents[id]=AllDependents[id]+parseFloat(quan)||parseFloat(quan)
        text += `${quan} of '${materials[id].name}' <small>(ID: ${materials[id].matID})</small><br>`
    })
    return text.slice(0, -4)
}

function strAllDependents(ul){
    for (const [key, val] of Object.entries(AllDependents)){
        const li=document.createElement("li")
        li.innerHTML= `${val} of '${materials[key].name}' <small>(ID: ${materials[key].matID})</small>`
        ul.append(li)
    }
}

function movingAvg(array, count, qualifier) {
    // calculate average for subarray
    const avg = function (array, qualifier) {
        let sum = 0, count = 0;
        for (let i in array) {
            const val = array[i];
            if (!qualifier || qualifier(val)) {
                sum += val;
                count++;
            }
        }
        return sum / count;
    };
    const result = [];

    // pad beginning of result with null values
    for (let i = 0; i < count; i++)
        result.push(null);
    // result.push(array[i])
    // result.push(avg(array.slice(0, i+1), qualifier))

    // calculate average for each subarray and add to result
    for (let i = 0; i <= array.length - count; i++) {

        const val = avg(array.slice(i, i + count), qualifier);
        if (isNaN(val))
            result.push(null);
        else
            result.push(Math.max(0, val));
    }

    return result;
}

import ESS from 'exponential-smoothing-stream'

async function expoSmooth(array, count) {
    const pr = new Promise((resolve, regect) => {
        const model = new ESS({
            smoothingFactor: count
        });
        array.forEach(num => {
            model.write(num)
        });
        const result = [];
        model.end()
        model.on('data', data => {
            result.push(Math.max(0, data));
        });
        model.on('end', () => {
            resolve([, ...result])
        });
        setInterval(() => {
            regect()
        }, 750)
    })
    return await pr
}

import regression from 'regression';

function linPredict(knownY) {
    const knownX = []
    for (let i = 0; i <= knownY.length; i++) {
        knownX.push(i + 1)
    }
    const data = []
    for (let i = 0; i < knownY.length; i++) {
        data.push([knownX[i], knownY[i]])
    }
    const model = regression.linear(data)
    const prediction = []
    knownX.forEach((x) => {
        prediction.push(Math.max(0, model.predict(x)[1]))
    })
    return prediction
}

function MSE(data, prediction) {
    const count = Math.min(data.length, prediction.length)
    let sum = 0
    for (let i = 5; i < count; i++) {
        sum += (data[i] - prediction[i]) ** 2
    }
    return (sum / (count - 5));
}