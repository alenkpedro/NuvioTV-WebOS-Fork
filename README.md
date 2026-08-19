# Nuvio Enhanced — LG webOS

Fork/reimplementação **LG-first** inspirada no trabalho de `ysosrs123/NuvioTV-Fork`.

O objetivo é levar para TVs LG webOS o máximo possível da filosofia do fork Android: reprodução rápida, pré-resolução de fontes, ranking automático, diagnóstico de playback e uma UI enxuta para controle remoto.

## O que vem do ysosrs123 (conceito/port)

- busca e ranking antecipado de streams enquanto o usuário ainda está na tela de detalhes;
- warm-up da melhor URL antes do play;
- priorização de 4K/remux/HDR/DV/HEVC e release groups de maior qualidade;
- foco em reduzir o tempo entre Play e o início do vídeo;
- `Stats for Nerds` com resolução, buffer, frames perdidos, host, addon, codec/HDR/áudio inferidos e warm-up medido;
- carregamento progressivo de catálogos para não travar a interface;
- interface monocromática, moderna e TV-first;
- configuração por dispositivo via `localStorage`.

Referência principal: https://github.com/ysosrs123/NuvioTV-Fork

## O que é necessariamente específico de LG/webOS

Só mantemos os componentes que não podem vir do Android: `appinfo.json`, empacotamento `.ipk`, HTML/CSS/JavaScript, navegação por keycodes do webOS e o player de vídeo nativo da plataforma.

Referência de requisitos/empacotamento webOS: https://github.com/NuvioMedia/NuvioWeb

## Limitações reais do webOS

ExoPlayer/Media3, `libdovi`, conversão DV7/DV5, MAT/IEC61937, data sources paralelos customizados e controle direto do tamanho do buffer são recursos do stack Android e não podem ser copiados para uma web app de LG. O projeto implementa equivalentes quando a plataforma expõe uma API adequada e deixa o restante a cargo do pipeline nativo da TV.

## Addons

Nenhum addon é incluído por padrão. Adicione uma URL `manifest.json` compatível com o protocolo Stremio em **Configurações → Addons**.

## Build

Requisitos: Node.js 20+ e npm.

```bash
npm install
npm run check
npm run package:webos
```

O pacote `.ipk` pode ser instalado com Developer Mode / webOS Dev Manager.

## Instalação paralela

O app usa o ID `com.alenkpedro.nuvio.enhanced`, portanto pode coexistir com o Nuvio oficial (`space.nuvio.webos`).

## Status

**0.1.0 alpha.** Esta primeira reconstrução troca completamente a base antiga do repositório e estabelece a arquitetura LG-first. Próximos ports devem priorizar playback diagnostics, source preparation e recursos do fork `ysosrs123` que possam ser reproduzidos de forma segura no webOS.

## Licença e créditos

Este projeto é uma reimplementação/derivação comunitária. Créditos ao NuvioMedia e especialmente ao `ysosrs123/NuvioTV-Fork` pelas ideias de otimização e UX que orientam este port. Não inclui mídia, fontes ou serviços de terceiros.
