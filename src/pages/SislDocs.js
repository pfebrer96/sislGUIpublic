import React, { Component } from 'react'

export default class SislDocs extends Component {
    render() {
        
        return (
            <object data={process.env.PUBLIC_URL + "/sisl-docs/html/index.html"} width="100%" height="100%"/>
        )
    }
}