"""Generate explicit CQRS messages/handlers and HTTP adapters from the reviewed contract.
Run from repository root. Does not read instructions or statuses from the workbook.
"""
import json, pathlib, re

ROOT = pathlib.Path('src/lens')
routes = json.loads(pathlib.Path('docs/api-tracker.json').read_text())
bindings = {}
def group(prefix, service, methods):
    for n, method in enumerate(methods.split(), 1):
        bindings[f'{prefix}-{n:03}'] = (service, method)
group('AUTH','Identity','register me updateMe getUser addDevice deleteDevice')
group('PHO','Photographer','create get update status search top me location')
group('PORT','Portfolio','create list get update remove add removeItem reorder')
group('CAL','Calendar','availability me create update remove block unblock')
group('BOOK','Booking','create get list accept reject cancel start completeShoot complete timeline dispute')
group('PAY','Payment','deposit remaining history get qr webhook refund refunds')
group('CHAT','Chat','create list messages send read signal signal attachment')
group('NOTI','Notification','list read readAll create consume consume consume')
group('LOC','Location','start update get stop get')
group('MEDIA','Media','upload complete get remove createGallery addGallery gallery publish download')
group('REV','Review','create list summary update remove')
group('SUB','Subscription','plans create me cancel usage webhook')
group('MOD','Moderation','create mine list get resolve _ _')
bindings['MOD-006']=('Identity','suspend');bindings['MOD-007']=('Identity','unsuspend')
group('ADM','Moderation','dashboard _ _ _ _ _ _')
for id,service,method in [('002','Identity','adminUsers'),('003','Identity','adminUser'),('004','Identity','status'),('005','Booking','admin'),('006','Payment','admin'),('007','Photographer','admin')]: bindings['ADM-'+id]=(service,method)
files={'Identity':'identity','Photographer':'photographers','Portfolio':'portfolios','Calendar':'calendar','Booking':'bookings','Payment':'payments','Chat':'chat','Notification':'notifications','Location':'location','Media':'media','Review':'reviews','Subscription':'subscriptions','Moderation':'moderation'}
# Field syntax name:type, optional fields end in ?. API uses SQL-style snake_case.
bodies={
 'AUTH-001':'fullname:text location:text?', 'AUTH-003':'fullname:text? avatar_url:url? phone_number:phone? gender:gender? dob:date?', 'AUTH-005':'token:token platform:platform',
 'PHO-001':'tax_code:text? styles:strings experience:experience location:text description:long?', 'PHO-003':'tax_code:text? styles:strings? experience:experience? description:long?', 'PHO-004':'is_available:bool', 'PHO-008':'location:text',
 'PORT-001':'name:text description:long? cover_media_id:uuid?', 'PORT-004':'name:text? description:long? cover_media_id:uuid?', 'PORT-006':'media_id:uuid','PORT-008':'item_ids:uuids',
 'CAL-003':'from:datetime to:datetime','CAL-004':'from:datetime to:datetime','CAL-006':'from:datetime to:datetime',
 'BOOK-001':'photographer_id:uuid plan_id:uuid location:text from:datetime to:datetime', 'BOOK-005':'reason:long','BOOK-006':'reason:long','BOOK-011':'reason:long',
 'PAY-001':'idempotency_key:key','PAY-002':'idempotency_key:key','PAY-006':'code:text desc:text success:bool data:object signature:text','PAY-007':'amount:money reason:long',
 'CHAT-001':'booking_id:uuid','CHAT-008':'media_id:uuid client_message_id:uuid content:long?',
 'NOTI-004':'user_id:uuid title:text body:long', 'LOC-002':'latitude:latitude longitude:longitude',
 'MEDIA-001':'content_type:mime file_size:size','MEDIA-002':'media_id:uuid','MEDIA-006':'media_id:uuid',
 'REV-001':'rating:rating punctuality_rating:rating attitude_rating:rating comment:long?', 'REV-004':'rating:rating? punctuality_rating:rating? attitude_rating:rating? comment:long?',
 'SUB-002':'plan_id:uuid idempotency_key:key','SUB-006':'code:text desc:text success:bool data:object signature:text',
 'MOD-001':'target_type:target target_id:uuid reason:long','MOD-005':'status:resolutionStatus resolution:long','ADM-004':'status:userStatus',
}
query_ids='PHO-005 PHO-006 PORT-002 BOOK-003 CHAT-002 CHAT-003 NOTI-001 REV-002 MOD-002 MOD-003 ADM-002 ADM-005 ADM-006 ADM-007'.split()
queries={id:'limit:limit? offset:offset?' for id in query_ids}
queries['PHO-005']+=' location:text? keyword:text? min_rating:minRating?'
queries['BOOK-003']+=' status:text? from:datetime? to:datetime?'
queries['CAL-001']='from:datetime? to:datetime?'
queries['MOD-003']+=' status:text? target_type:target?'
queries['ADM-002']+=' status:userStatus? keyword:text?'
queries['ADM-005']+=' status:text?';queries['ADM-006']+=' status:text?'
enums={'gender':['male','female','other'],'platform':['ios','android','web'],'mime':['image/jpeg','image/png','image/webp'],'target':['user','review','booking','media'],'resolutionStatus':['resolved','rejected','escalated'],'userStatus':['active','suspended']}
numbers={'experience':(0,100),'money':(1,9000000000000),'size':(1,104857600),'rating':(1,5),'latitude':(-90,90),'longitude':(-180,180),'limit':(1,100),'offset':(0,1000000),'minRating':(0,5)}
def fields(spec):
    return [(n,t.rstrip('?'),t.endswith('?')) for f in spec.split() for n,t in [f.split(':')]]
def ts_type(t):
    if t in enums: return ' | '.join(repr(x) for x in enums[t])
    return 'number' if t in numbers else 'boolean' if t=='bool' else 'string[]' if t in ['strings','uuids'] else 'Record<string, unknown>' if t=='object' else 'string'
def props(spec,decorators=False,query=False):
    lines=[]
    for n,t,optional in fields(spec):
        typ=ts_type(t); ds=[]
        if decorators:
            options={'description':n.replace('_',' ')}
            if t in enums: options['enum']=enums[t]
            if t in numbers: options.update(minimum=numbers[t][0],maximum=numbers[t][1],example=20 if t=='limit' else 0 if t in ['offset','latitude','longitude'] else 5 if t in ['rating','experience'] else 1024 if t=='size' else 100000 if t=='money' else 4)
            elif t=='uuid': options.update(format='uuid',example='11111111-1111-4111-8111-111111111111')
            elif t=='datetime': options.update(format='date-time',example='2026-12-01T09:00:00+07:00')
            elif t=='object': options.update(type='object',additionalProperties=True,description='Original signed provider webhook JSON, nested unchanged under payload')
            elif t in ['strings','uuids']: options.update(type='array',items={'type':'string'})
            elif t=='bool': options.update(type='boolean',example=True)
            else: options.update(type='string')
            ds.append('@'+('ApiPropertyOptional' if optional else 'ApiProperty')+'('+json.dumps(options)+')')
            if optional: ds.append('@ValidateIf((_object, value) => value !== undefined)')
            if t in numbers:
                if query: ds.append('@Type(() => Number)')
                ds.extend(['@IsNumber({allowNaN:false,allowInfinity:false})' if t in ['latitude','longitude','minRating'] else '@IsInt()',f'@Min({numbers[t][0]})',f'@Max({numbers[t][1]})'])
            elif t in enums: ds.append('@IsIn('+json.dumps(enums[t])+')')
            elif t=='uuid': ds.append('@IsUUID()')
            elif t=='datetime': ds.extend(['@IsISO8601({strict:true})',"@Matches(/T.*(Z|[+-]\\d{2}:\\d{2})$/)"])
            elif t=='date': ds.extend(['@IsISO8601({strict:true})',"@Matches(/^\\d{4}-\\d{2}-\\d{2}$/)"])
            elif t=='bool': ds.append('@IsBoolean()')
            elif t=='object': ds.append('@IsObject()')
            elif t in ['strings','uuids']: ds.extend(['@IsArray()','@ArrayMaxSize(200)','@ArrayUnique()', '@IsUUID(undefined,{each:true})' if t=='uuids' else '@IsString({each:true})']);
            else:
                ds.extend(['@IsString()','@MinLength(1)',f'@MaxLength({10000 if t=="long" else 4096 if t=="token" else 128 if t=="key" else 500})'])
                if t=='url': ds.append('@IsUrl({protocols:["https"],require_protocol:true})')
                if t=='phone': ds.append('@Matches(/^\\+?[0-9]{8,15}$/)')
            lines+=['  '+d for d in ds]
        lines.append(f'  {n}{"?" if optional else "!" if decorators else ""}: {typ};')
    return '\n'.join(lines)

http=[r for r in routes if r['method'] in ['GET','POST','PATCH','DELETE']]
http.sort(key=lambda r:(r['path'].count(':'),-len(r['path'].split('/')),r['path']))
contracts=[];dtos=[];controller_imports={};controllers={};handlers={};handler_names=[]
for r in http:
    id=r['id'];service,method=bindings[id];name=service+method[0].upper()+method[1:]+('Query' if r['method']=='GET' else 'Command');r['message']=name
    params=re.findall(r':(\w+)',r['path']);param_spec=' '.join(p+(':text' if p=='provider' else ':uuid') for p in params)
    input_spec=' '.join([param_spec,bodies.get(id,''),queries.get(id,'')]).strip()
    if id in ['PAY-006','SUB-006']: input_spec=param_spec+' payload:object'
    contracts.append('export interface '+name+'Input {\n'+props(input_spec)+'\n}' if input_spec else 'export type '+name+'Input = Record<string, never>;')
    for kind,spec in [('Body',bodies.get(id,'')),('Query',queries.get(id,''))]:
        if spec: dtos.append('export class '+name+kind+'Dto {\n'+props(spec,True,kind=='Query')+'\n}')
    command=r['method']!='GET';folder='commands' if command else 'queries';dec='CommandHandler' if command else 'QueryHandler';interface='ICommandHandler' if command else 'IQueryHandler'
    key=(service,folder);handlers.setdefault(key,[])
    argc=1 if (service,method)==('Subscription','plans') else 2 if method in ['me','readAll','dashboard','usage'] else 3
    args=['s','message.actor','message.input'][:argc]
    handlers[key].append(f'''export class {name} {{
  constructor(public readonly actor: Actor, public readonly input: Inputs.{name}Input) {{}}
}}
@{dec}({name})
export class {name}Handler implements {interface}<{name}> {{
  constructor(private readonly uow: UnitOfWork, private readonly useCases: {service}UseCases) {{}}
  execute(message: {name}) {{ return this.uow.{"write" if command else "read"}(s => this.useCases.{method}({', '.join(args)})); }}
}}
''')
    if argc==1: handlers[key][-1]=handlers[key][-1].replace(f'execute(message: {name})', 'execute()')
    if (service,method) in [('Payment','deposit'),('Payment','remaining'),('Subscription','create')]:
        handlers[key][-1]=handlers[key][-1].replace(f'this.useCases.{method}({", ".join(args)}));',f'this.useCases.{method}({", ".join(args)})).then(result => this.useCases.fulfill(this.uow,result));')
    if service=='Location' and method=='update':
        handlers[key][-1]=handlers[key][-1].replace('private readonly useCases: LocationUseCases)', 'private readonly useCases: LocationUseCases, private readonly realtime: RealtimePublisher)')
        handlers[key][-1]=handlers[key][-1].replace('return this.uow.write(s => this.useCases.update(s, message.actor, message.input));', '''return this.uow.write(async s => {
      const result=await this.useCases.update(s,message.actor,message.input);
      const {recipients}=await bookingAccess(s,message.actor,message.input.id,'photographer');
      return {result,recipients};
    }).then(({result,recipients})=>{this.realtime.publish(recipients,'booking.location.updated',result);return result;});''')
    handler_names.append((service,folder,name+'Handler'))
    controllers.setdefault(service,[]);controller_imports.setdefault(service,[])
    controller_imports[service].append((folder,name))
    role=r['role'];public=role in ['Public','Payment Provider'] and id!='AUTH-001';roles=[]
    if role not in ['Public','Authenticated','Participant','Owner','Authorized','Payment Provider']: roles=[{'Internal':'internal','Core':'internal'}.get(x,x.lower()) for x in role.split('/')]
    auth='@Public()' if public else '@Registration()' if id=='AUTH-001' else '@Access('+json.dumps(list(set(roles)))+')'
    decorators=[f'@{r["method"].title()}({json.dumps(r["path"].lstrip("/"))})',f'@ApiOperation({{ operationId: "{id}", summary: {json.dumps(r["summary"],ensure_ascii=False)}, description: {json.dumps(r["description"]+" Role: "+role,ensure_ascii=False)} }})',auth]
    if not public: decorators+=['@ApiBearerAuth()','@ApiUnauthorizedResponse({description:"Missing or invalid Keycloak access token"})','@ApiForbiddenResponse({description:"Role, ownership or account status denied"})']
    decorators+=['@ApiBadRequestResponse({description:"DTO validation or business constraint failed"})','@ApiNotFoundResponse({description:"Resource not found"})','@ApiConflictResponse({description:"State transition or uniqueness conflict"})','@ApiServiceUnavailableResponse({description:"External integration is not configured or unavailable"})']
    for p in params: decorators.append(f'@ApiParam({{name:"{p}",type:String,description:"'+('Payment provider (payos)' if p=='provider' else 'Resource UUID')+'"})')
    for n,t,opt in fields(queries.get(id,'')): decorators.append('@ApiQuery('+json.dumps({'name':n,'required':not opt,'type':'number' if t in numbers else 'string','description':n.replace('_',' ')})+')')
    if bodies.get(id): decorators.append(f'@ApiBody({{type: Dto.{name}BodyDto}})')
    decorators.append(f'@ApiResponse({{status:200,description:"Successful result",schema: responseSchema("{id}")}})')
    if r['method']=='POST': decorators.append('@HttpCode(200)')
    args=['@Req() req: {actor?: Actor}']
    args += [f'@Param("{p}"'+(', new ParseUUIDPipe()' if p!='provider' else '')+f') {p}: string' for p in params]
    if bodies.get(id): args.append(f'@Body() body: Dto.{name}BodyDto')
    if queries.get(id): args.append(f'@Query() query: Dto.{name}QueryDto')
    obj=', '.join((['...body'] if bodies.get(id) else [])+(['...query'] if queries.get(id) else [])+params)
    if id in ['PAY-006','SUB-006']: obj='payload:{...body}, provider'
    bus='commands' if command else 'queries'
    controllers[service].append('  '+'\n  '.join(decorators)+f'\n  {method}({", ".join(args)}) {{\n    return this.{bus}.execute(new {name}(req.actor ?? {{sub:"",roles:[]}}, {{ {obj} }}));\n  }}\n')

(ROOT/'application/contracts.ts').write_text('// Application inputs have no dependency on HTTP or validation decorators.\n'+'\n'.join(contracts))
(ROOT/'presentation/dto.ts').write_text("import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';\nimport { Type } from 'class-transformer';\nimport { IsString, IsUUID, IsISO8601, IsBoolean, IsObject, IsInt, IsNumber, IsArray, IsIn, Min, Max, MinLength, MaxLength, IsUrl, Matches, ArrayMaxSize, ArrayUnique, ValidateIf } from 'class-validator';\n"+'\n'.join(dtos))
for (service,folder),content in handlers.items():
    dest=ROOT/'application'/folder;dest.mkdir(exist_ok=True)
    extra="import { RealtimePublisher } from '../../domain/ports';\nimport { bookingAccess } from '../access';\n" if service=='Location' and folder=='commands' else ''
    (dest/(files[service]+'.ts')).write_text(f"import {{ {'CommandHandler, ICommandHandler' if folder=='commands' else 'QueryHandler, IQueryHandler'} }} from '@nestjs/cqrs';\nimport {{ UnitOfWork, type Actor }} from '../../domain/ports';\nimport type * as Inputs from '../contracts';\nimport {{ {service}UseCases }} from '../{files[service]}';\n"+extra+'\n'.join(content))
for service,content in controllers.items():
    imports="import { Body, Controller, Get, Post, Patch, Delete, Param, Query, Req, HttpCode, ParseUUIDPipe } from '@nestjs/common';\nimport { CommandBus, QueryBus } from '@nestjs/cqrs';\nimport { ApiTags, ApiOperation, ApiResponse, ApiBody, ApiParam, ApiQuery, ApiBearerAuth, ApiBadRequestResponse, ApiUnauthorizedResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiConflictResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';\nimport type { Actor } from '../domain/ports';\nimport { Access, Public, Registration } from './auth';\nimport * as Dto from './dto';\nimport { responseSchema } from './responses';\n"
    for folder,name in controller_imports[service]: imports+=f"import {{ {name} }} from '../application/{folder}/{files[service]}';\n"
    controller=f"\n@ApiTags('{service}')\n@Controller()\nexport class {service}Controller {{\n  constructor(private readonly commands:CommandBus,private readonly queries:QueryBus) {{}}\n"+'\n'.join(content)+'}\n'
    def keep_used(match):
        names=[n.strip() for n in match[1].split(',') if re.search((r'@' if n.strip() in ['Public','Registration','Access'] else r'\b')+re.escape(n.strip())+r'\b',controller)]
        return 'import { '+', '.join(names)+' } from '+match[2]+';' if names else ''
    imports=re.sub(r'import \{([^}]+)\} from ([^;]+);',keep_used,imports)
    (ROOT/'presentation'/(files[service]+'.controller.ts')).write_text(imports+controller)
imports=[];providers=[];ctrls=[]
for service in controllers:
    imports.append(f"import {{ {service}Controller }} from './{files[service]}.controller';");ctrls.append(service+'Controller')
    imports.append(f"import {{ {service}UseCases }} from '../application/{files[service]}';");providers.append(service+'UseCases')
for service,folder,handler in handler_names:
    imports.append(f"import {{ {handler} }} from '../application/{folder}/{files[service]}';");providers.append(handler)
(ROOT/'presentation/providers.ts').write_text('\n'.join(imports)+'\nexport const lensControllers = ['+','.join(ctrls)+'];\nexport const lensProviders = ['+','.join(providers)+'];\n')
print(f'Generated {len(http)} HTTP endpoints, {len(handler_names)} CQRS handlers')
